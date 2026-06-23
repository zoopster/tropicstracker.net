import { sectionHead } from "../ui.js";
import { whenLeafletReady, createMap } from "../map.js";
import {
    fetchRainviewerFrames,
    rainviewerTileUrl,
    nexradTileUrl,
    nexradFrameTimes,
    IEM_ATTRIBUTION,
    RAINVIEWER_ATTRIBUTION,
    geocode,
} from "../data/radar.js";

const FRAME_MS = 500; // animation step
const CONUS = { center: [39, -98], zoom: 4 };

let map = null;
let attribution = null;
let source = "rainviewer";

// Generic frame model shared by both sources.
let frames = [];        // [{ time(ms), forecast }] oldest -> newest
let frameLayers = [];   // one L.tileLayer per frame
let current = 0;
let opacity = 0.7;
let playing = false;
let animTimer = null;
let loadToken = 0;      // guards against overlapping source switches

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
        frames = []; frameLayers = []; current = 0; playing = false; source = "rainviewer";

        map = createMap(root.querySelector("#radar-map"), CONUS);
        attribution = map.attributionControl;

        wireControls(root);
        locate(root, { silent: true }); // never blocks rendering

        await loadSource(root, "rainviewer");
    },
};

function wireControls(root) {
    root.querySelector("#radar-play").addEventListener("click", () => (playing ? pause(root) : play(root)));

    root.querySelector("#radar-opacity").addEventListener("input", (e) => {
        opacity = Number(e.target.value) / 100;
        if (frameLayers[current]) frameLayers[current].setOpacity(opacity);
    });

    root.querySelectorAll('input[name="radar-src"]').forEach((r) =>
        r.addEventListener("change", (e) => loadSource(root, e.target.value))
    );

    root.querySelector("#radar-locate").addEventListener("click", () => locate(root, { silent: false }));

    root.querySelector("#radar-search").addEventListener("submit", (e) => {
        e.preventDefault();
        search(root, root.querySelector("#radar-place").value.trim());
    });
}

function clearFrames() {
    stopAnim();
    frameLayers.forEach((l) => map.removeLayer(l));
    frameLayers = [];
    frames = [];
    current = 0;
}

// Build the frame set for a source and start the loop. Guarded by a token so a
// rapid source switch does not leave a half-built previous source on the map.
async function loadSource(root, src) {
    source = src;
    const token = ++loadToken;
    const timeEl = root.querySelector("#radar-time");
    clearFrames();
    timeEl.textContent = "Loading radar...";

    try {
        if (src === "nexrad") {
            attribution.removeAttribution(RAINVIEWER_ATTRIBUTION);
            attribution.addAttribution(IEM_ATTRIBUTION);
            frames = nexradFrameTimes().map((t) => ({ time: t, forecast: false }));
            frameLayers = frames.map((f) =>
                L.tileLayer(nexradTileUrl(f.time), { opacity: 0, zIndex: 5, tileSize: 256 })
            );
        } else {
            attribution.removeAttribution(IEM_ATTRIBUTION);
            attribution.addAttribution(RAINVIEWER_ATTRIBUTION);
            const data = await fetchRainviewerFrames();
            if (token !== loadToken) return; // superseded by a newer switch
            frames = data.frames.map((f) => ({ time: f.time * 1000, forecast: f.forecast }));
            frameLayers = frames.map((f, i) =>
                L.tileLayer(rainviewerTileUrl(data.host, data.frames[i].path), { opacity: 0, zIndex: 5, tileSize: 256 })
            );
        }

        if (token !== loadToken) return;
        if (!frames.length) throw new Error("no frames");

        frameLayers.forEach((l) => l.addTo(map));
        current = frames.length - 1; // newest frame
        showFrame(root, current);
        play(root);
    } catch (err) {
        console.error("radar load failed:", err);
        timeEl.textContent = "Radar unavailable. Try the other source or refresh.";
    }
}

function showFrame(root, i) {
    frameLayers.forEach((l, idx) => l.setOpacity(idx === i ? opacity : 0));
    current = i;
    const f = frames[i];
    if (!f) return;
    const time = new Date(f.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const tag = source === "nexrad" ? "NEXRAD" : f.forecast ? "Forecast" : "Observed";
    root.querySelector("#radar-time").textContent = `${tag} ${time}`;
}

function play(root) {
    if (!frameLayers.length) return;
    playing = true;
    setPlayBtn(root, true);
    stopAnim();
    animTimer = setInterval(() => showFrame(root, (current + 1) % frameLayers.length), FRAME_MS);
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

function locate(root, { silent }) {
    const msg = root.querySelector("#radar-msg");
    if (!navigator.geolocation) {
        if (!silent) msg.textContent = "Geolocation not supported.";
        return;
    }
    if (!silent) msg.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition(
        (pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 7); msg.textContent = ""; },
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
