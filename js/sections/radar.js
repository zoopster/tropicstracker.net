import { sectionHead, esc } from "../ui.js";
import { whenLeafletReady, createMap } from "../map.js";
import {
    fetchRainviewerFrames,
    rainviewerTileUrl,
    IEM_NEXRAD_URL,
    IEM_ATTRIBUTION,
    RAINVIEWER_ATTRIBUTION,
    geocode,
} from "../data/radar.js";

const FRAME_MS = 500; // animation step
const CONUS = { center: [39, -98], zoom: 4 };

let map = null;
let frameLayers = []; // one tile layer per RainViewer frame
let frames = [];
let iemLayer = null;
let attribution = null;
let current = 0;
let opacity = 0.7;
let playing = false;
let animTimer = null;

export default {
    id: "radar",
    label: "Radar",
    icon: "fa-broadcast-tower",

    render() {
        return (
            sectionHead("fa-broadcast-tower", "Local Radar",
                "Animated precipitation radar. RainViewer worldwide, or the official NWS NEXRAD composite for the US.") +
            `<div class="track-toolbar radar-toolbar">
                <button class="btn" id="radar-play"><i class="fas fa-play" aria-hidden="true"></i> Play</button>
                <span class="updated" id="radar-time">Loading radar...</span>
                <span class="radar-spacer"></span>
                <label class="radar-src"><input type="radio" name="radar-src" value="rainviewer" checked> RainViewer</label>
                <label class="radar-src"><input type="radio" name="radar-src" value="nexrad"> NWS NEXRAD (US)</label>
             </div>
             <div class="track-toolbar radar-toolbar">
                <form id="radar-search" class="radar-search-form">
                    <input type="search" id="radar-place" class="resources-search" style="margin:0;max-width:220px"
                           placeholder="Search a place..." aria-label="Search a place">
                    <button class="btn" type="submit"><i class="fas fa-magnifying-glass" aria-hidden="true"></i></button>
                </form>
                <button class="btn" id="radar-locate"><i class="fas fa-location-crosshairs" aria-hidden="true"></i> Locate me</button>
                <label class="radar-opacity">Opacity
                    <input type="range" id="radar-opacity" min="20" max="100" value="70" aria-label="Radar opacity">
                </label>
                <span class="updated" id="radar-msg"></span>
             </div>
             <div id="radar-map" role="application" aria-label="Radar map"></div>`
        );
    },

    async mount(root) {
        await whenLeafletReady();

        stopAnim();
        if (map) { map.remove(); map = null; }
        frameLayers = []; frames = []; iemLayer = null; current = 0; playing = false;

        map = createMap(root.querySelector("#radar-map"), CONUS);
        attribution = map.attributionControl;

        wireControls(root);

        // Try to center on the user, but never block rendering on it.
        locate(root, { silent: true });

        await loadRainviewer(root);
    },
};

function wireControls(root) {
    root.querySelector("#radar-play").addEventListener("click", () => (playing ? pause(root) : play(root)));

    root.querySelector("#radar-opacity").addEventListener("input", (e) => {
        opacity = Number(e.target.value) / 100;
        if (frameLayers[current]) frameLayers[current].setOpacity(opacity);
        if (iemLayer) iemLayer.setOpacity(opacity);
    });

    root.querySelectorAll('input[name="radar-src"]').forEach((r) =>
        r.addEventListener("change", (e) => setSource(root, e.target.value))
    );

    root.querySelector("#radar-locate").addEventListener("click", () => locate(root, { silent: false }));

    root.querySelector("#radar-search").addEventListener("submit", (e) => {
        e.preventDefault();
        search(root, root.querySelector("#radar-place").value.trim());
    });
}

async function loadRainviewer(root) {
    const timeEl = root.querySelector("#radar-time");
    try {
        const data = await fetchRainviewerFrames();
        frames = data.frames;
        if (!frames.length) throw new Error("no frames");

        frameLayers = frames.map((f) =>
            L.tileLayer(rainviewerTileUrl(data.host, f.path), {
                opacity: 0,
                zIndex: 5,
                tileSize: 256,
            }).addTo(map)
        );
        attribution.addAttribution(RAINVIEWER_ATTRIBUTION);

        current = frames.length - 1; // newest observed frame
        showFrame(root, current);
        play(root); // autoplay the loop
    } catch (err) {
        console.error("radar load failed:", err);
        timeEl.textContent = "Radar unavailable. Try NWS NEXRAD or refresh.";
    }
}

function showFrame(root, i) {
    frameLayers.forEach((l, idx) => l.setOpacity(idx === i ? opacity : 0));
    current = i;
    const f = frames[i];
    if (f) {
        const time = new Date(f.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        root.querySelector("#radar-time").textContent =
            `${f.forecast ? "Forecast" : "Observed"} ${time}`;
    }
}

function play(root) {
    if (!frameLayers.length) return;
    playing = true;
    setPlayBtn(root, true);
    stopAnim();
    animTimer = setInterval(() => {
        showFrame(root, (current + 1) % frameLayers.length);
    }, FRAME_MS);
}

function pause(root) {
    playing = false;
    setPlayBtn(root, false);
    stopAnim();
}

function stopAnim() {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
}

function setPlayBtn(root, isPlaying) {
    const btn = root.querySelector("#radar-play");
    if (btn) btn.innerHTML = isPlaying
        ? '<i class="fas fa-pause" aria-hidden="true"></i> Pause'
        : '<i class="fas fa-play" aria-hidden="true"></i> Play';
}

function setSource(root, src) {
    if (src === "nexrad") {
        pause(root);
        frameLayers.forEach((l) => l.setOpacity(0));
        if (!iemLayer) {
            iemLayer = L.tileLayer(IEM_NEXRAD_URL, { opacity, zIndex: 5 }).addTo(map);
            attribution.addAttribution(IEM_ATTRIBUTION);
        } else {
            iemLayer.addTo(map);
        }
        root.querySelector("#radar-time").textContent = "NWS NEXRAD composite (latest)";
        root.querySelector("#radar-play").disabled = true;
    } else {
        if (iemLayer) map.removeLayer(iemLayer);
        root.querySelector("#radar-play").disabled = false;
        if (frameLayers.length) { showFrame(root, current); play(root); }
    }
}

function locate(root, { silent }) {
    const msg = root.querySelector("#radar-msg");
    if (!navigator.geolocation) {
        if (!silent) msg.textContent = "Geolocation not supported.";
        return;
    }
    if (!silent) msg.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 7);
            msg.textContent = "";
        },
        () => { if (!silent) msg.textContent = "Location unavailable. Search instead."; },
        { timeout: 8000 }
    );
}

async function search(root, query) {
    const msg = root.querySelector("#radar-msg");
    if (!query) return;
    msg.textContent = "Searching...";
    try {
        const hit = await geocode(query);
        if (!hit) { msg.textContent = `No match for "${query}".`; return; }
        map.setView([hit.lat, hit.lon], 7);
        msg.textContent = hit.label;
    } catch (err) {
        console.error("geocode failed:", err);
        msg.textContent = "Search unavailable.";
    }
}
