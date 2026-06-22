import { sectionHead, esc } from "../ui.js";
import { cssVar, whenLeafletReady, createMap } from "../map.js";
import {
    fetchStormLayers,
    summarizeStorms,
    categoryForWindKt,
    knotsToMph,
    compassDir,
} from "../data/storms.js";

const REFRESH_MS = 10 * 60 * 1000; // auto-refresh every 10 minutes

let map = null;
let dataLayers = null; // L.LayerGroup of all rendered features
let refreshTimer = null;

export default {
    id: "track",
    label: "Track",
    icon: "fa-map-marked-alt",

    render() {
        return (
            sectionHead("fa-map-marked-alt", "Live Storm Tracking",
                "Active tropical systems worldwide: current position, forecast track, and the cone of uncertainty. Source: NHC / JTWC via Esri Living Atlas.") +
            `<div class="track-toolbar">
                <button class="btn" id="storm-refresh"><i class="fas fa-rotate-right" aria-hidden="true"></i> Refresh</button>
                <span class="updated" id="storm-updated">Loading...</span>
             </div>
             <div class="track-layout">
                <aside class="storm-panel" aria-label="Active storms">
                    <h2><i class="fas fa-list" aria-hidden="true"></i> Active Systems</h2>
                    <div class="storm-list" id="storm-list">
                        <div class="panel-empty"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i>Loading active systems...</div>
                    </div>
                </aside>
                <div>
                    <div id="storm-map" role="application" aria-label="Storm tracking map"></div>
                    <div class="map-legend" id="map-legend"></div>
                </div>
             </div>`
        );
    },

    async mount(root) {
        await whenLeafletReady();

        // Clean up a prior instance if the user navigated away and back.
        clearInterval(refreshTimer);
        if (map) { map.remove(); map = null; dataLayers = null; }

        map = createMap(root.querySelector("#storm-map"), { center: [20, -55], zoom: 3 });

        renderLegend(root.querySelector("#map-legend"));

        const refreshBtn = root.querySelector("#storm-refresh");
        refreshBtn.addEventListener("click", () => load(root));

        await load(root);

        clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            // Only refresh while the Track section is on screen.
            if (document.getElementById("storm-map")) load(root);
            else clearInterval(refreshTimer);
        }, REFRESH_MS);
    },
};

async function load(root) {
    const updated = root.querySelector("#storm-updated");
    const listEl = root.querySelector("#storm-list");
    const btn = root.querySelector("#storm-refresh");
    if (btn) btn.disabled = true;
    if (updated) updated.textContent = "Updating...";

    try {
        const layers = await fetchStormLayers();
        const storms = summarizeStorms(layers.points);

        drawLayers(layers, storms);
        renderList(listEl, storms);

        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (updated) updated.textContent = storms.length
            ? `${storms.length} active · updated ${time}`
            : `No active systems · checked ${time}`;
    } catch (err) {
        console.error("storm load failed:", err);
        if (updated) updated.textContent = "Data unavailable. Retry in a moment.";
        if (listEl) listEl.innerHTML = errorState();
    } finally {
        if (btn) btn.disabled = false;
    }
}

function drawLayers(layers, storms) {
    if (dataLayers) { map.removeLayer(dataLayers); dataLayers = null; }
    const group = L.layerGroup();

    // Cone of uncertainty (under everything).
    L.geoJSON(layers.cone, {
        style: { color: "#ffffff", weight: 1, fillColor: "#ffffff", fillOpacity: 0.12 },
    }).addTo(group);

    // Watches & warnings (coastline highlights).
    L.geoJSON(layers.watches, {
        style: { color: cssVar("--cat-3"), weight: 4, opacity: 0.85 },
        onEachFeature: (f, l) => {
            const t = f.properties?.TCWW || f.properties?.TYPE || "Watch / Warning";
            l.bindPopup(`<b>${esc(String(t))}</b>`);
        },
    }).addTo(group);

    // Observed (past) track, then forecast track.
    L.geoJSON(layers.observedTrack, {
        style: { color: cssVar("--text-dim"), weight: 2, opacity: 0.8 },
    }).addTo(group);
    L.geoJSON(layers.forecastTrack, {
        style: { color: cssVar("--accent-bright"), weight: 2, dashArray: "6 6" },
    }).addTo(group);

    // Forecast points: small markers, colored by category at that step.
    L.geoJSON(layers.points, {
        pointToLayer: (f, latlng) => {
            const cat = categoryForWindKt(f.properties?.MAXWIND);
            return L.circleMarker(latlng, {
                radius: 4,
                color: "#0b1220",
                weight: 1,
                fillColor: cssVar(cat.color),
                fillOpacity: 0.9,
            });
        },
    }).addTo(group);

    // Current-position markers (larger, labeled), built from the summary.
    const bounds = [];
    for (const s of storms) {
        if (s.lat == null || s.lon == null) continue;
        const color = cssVar(s.category.color);
        const marker = L.marker([s.lat, s.lon], {
            icon: L.divIcon({
                className: "",
                html: `<div class="storm-marker" style="width:18px;height:18px;background:${color}"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            }),
        });
        marker.bindPopup(stormPopup(s));
        marker.addTo(group);
        s._marker = marker;
        bounds.push([s.lat, s.lon]);
    }

    group.addTo(map);
    dataLayers = group;

    if (bounds.length) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 });
    }
}

function stormPopup(s) {
    const mph = s.windKt != null ? `${knotsToMph(s.windKt)} mph (${s.windKt} kt)` : "n/a";
    let move = "n/a";
    if (s.speedKt === 0) move = "Stationary";
    else if (s.dir != null && s.speedKt != null) move = `${compassDir(s.dir)} at ${knotsToMph(s.speedKt)} mph`;
    return `
        <b>${esc(s.name)}</b><br>
        ${esc(s.category.label)}<br>
        Max wind: ${esc(mph)}<br>
        Moving: ${esc(move)}<br>
        ${s.mslp ? `Pressure: ${s.mslp} mb<br>` : ""}
        ${s.dateLabel ? `<small>${esc(s.dateLabel)}</small>` : ""}`;
}

function renderList(listEl, storms) {
    if (!listEl) return;
    if (!storms.length) {
        listEl.innerHTML = emptyState();
        return;
    }
    listEl.innerHTML = storms
        .map((s, i) => {
            const color = cssVar(s.category.color);
            const windTxt = s.windKt != null ? `${knotsToMph(s.windKt)} mph` : "";
            return `
                <button class="storm-item" data-idx="${i}">
                    <span class="cat-chip" style="background:${color}">${esc(s.category.short)}</span>
                    <span class="storm-meta">
                        <span class="name">${esc(s.name)}</span><br>
                        <span class="sub">${esc(s.category.label)}${windTxt ? " · " + esc(windTxt) : ""}${s.basin ? " · " + esc(s.basin) : ""}</span>
                    </span>
                </button>`;
        })
        .join("");

    listEl.querySelectorAll(".storm-item").forEach((btn) => {
        btn.addEventListener("click", () => {
            const s = storms[Number(btn.dataset.idx)];
            if (s && s.lat != null) {
                map.flyTo([s.lat, s.lon], 6, { duration: 0.8 });
                if (s._marker) s._marker.openPopup();
            }
        });
    });
}

function emptyState() {
    return `
        <div class="panel-empty">
            <i class="fas fa-sun" aria-hidden="true"></i>
            <strong>No active tropical systems</strong>
            <p>Nothing to track right now. The map will update automatically when systems develop.</p>
            <p><a href="#resources">Browse outlook resources</a></p>
        </div>`;
}

function errorState() {
    return `
        <div class="panel-empty">
            <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
            <strong>Data temporarily unavailable</strong>
            <p>Could not reach the storm data service. Use Refresh to try again.</p>
        </div>`;
}

function renderLegend(el) {
    if (!el) return;
    const items = [
        ["Tropical Storm", "--cat-ts"],
        ["Cat 1", "--cat-1"],
        ["Cat 2", "--cat-2"],
        ["Cat 3", "--cat-3"],
        ["Cat 4", "--cat-4"],
        ["Cat 5", "--cat-5"],
    ];
    el.innerHTML =
        items
            .map(([label, v]) => `<span><i class="dot" style="background:${cssVar(v)}"></i>${label}</span>`)
            .join("") +
        `<span><i class="dot" style="background:${cssVar("--accent-bright")}"></i>Forecast track</span>`;
}
