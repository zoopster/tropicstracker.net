// Live tropical storm data from the Esri Living Atlas "Active Hurricanes" service,
// which consolidates NHC/JTWC advisories into single layers per feature type.
// All layers are served with permissive CORS, so no proxy is needed.

const BASE =
    "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Active_Hurricanes_v1/FeatureServer";

// Layer ids within the service.
const LAYER = {
    forecastPosition: 0,
    observedPosition: 1,
    forecastTrack: 2,
    observedTrack: 3,
    cone: 4,
    watchesWarnings: 5,
};

const MISSING = 9999; // sentinel used by the service for "no value"

async function queryGeoJSON(layerId, { where = "1=1", outFields = "*" } = {}) {
    const url =
        `${BASE}/${layerId}/query?` +
        new URLSearchParams({
            where,
            outFields,
            f: "geojson",
            returnGeometry: "true",
            outSR: "4326",
        });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Layer ${layerId} HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.type !== "FeatureCollection") {
        throw new Error(`Layer ${layerId} returned no FeatureCollection`);
    }
    return data;
}

/**
 * Fetch all map layers in parallel. Individual failures degrade gracefully:
 * a failed layer comes back as an empty FeatureCollection.
 */
export async function fetchStormLayers() {
    const ids = [
        ["cone", LAYER.cone],
        ["forecastTrack", LAYER.forecastTrack],
        ["observedTrack", LAYER.observedTrack],
        ["points", LAYER.forecastPosition],
        ["watches", LAYER.watchesWarnings],
    ];
    const results = await Promise.allSettled(ids.map(([, id]) => queryGeoJSON(id)));
    const out = {};
    results.forEach((r, i) => {
        const key = ids[i][0];
        out[key] =
            r.status === "fulfilled"
                ? r.value
                : { type: "FeatureCollection", features: [] };
        if (r.status === "rejected") console.warn(`storm layer "${key}" failed:`, r.reason);
    });
    return out;
}

export function knotsToMph(kt) {
    return Math.round(kt * 1.15078);
}

/**
 * Saffir-Simpson classification from max sustained wind in knots.
 * Returns a label, short label, and the CSS color token to use.
 */
export function categoryForWindKt(kt) {
    if (kt == null || kt === MISSING) return { label: "Unknown", short: "?", color: "--text-dim" };
    if (kt < 34) return { label: "Tropical Depression", short: "TD", color: "--accent-bright" };
    if (kt < 64) return { label: "Tropical Storm", short: "TS", color: "--cat-ts" };
    if (kt < 83) return { label: "Category 1 Hurricane", short: "C1", color: "--cat-1" };
    if (kt < 96) return { label: "Category 2 Hurricane", short: "C2", color: "--cat-2" };
    if (kt < 113) return { label: "Category 3 Hurricane", short: "C3", color: "--cat-3" };
    if (kt < 137) return { label: "Category 4 Hurricane", short: "C4", color: "--cat-4" };
    return { label: "Category 5 Hurricane", short: "C5", color: "--cat-5" };
}

const BASIN_NAMES = {
    AL: "Atlantic",
    EP: "Eastern Pacific",
    CP: "Central Pacific",
    WP: "Western Pacific",
    IO: "Indian Ocean",
    SH: "Southern Hemisphere",
};

/**
 * Reduce the forecast-position points into one summary per storm, using the
 * earliest forecast hour (TAU) as the current position. Returns an array
 * sorted strongest-first.
 */
export function summarizeStorms(pointsGeoJSON) {
    const byStorm = new Map();

    for (const f of pointsGeoJSON.features || []) {
        const p = f.properties || {};
        const name = p.STORMNAME || "Unknown";
        const tau = typeof p.TAU === "number" ? p.TAU : Infinity;
        const existing = byStorm.get(name);
        if (!existing || tau < existing._tau) {
            const [lon, lat] = f.geometry?.coordinates || [p.LON, p.LAT];
            byStorm.set(name, {
                _tau: tau,
                name,
                basin: BASIN_NAMES[p.BASIN] || p.BASIN || "",
                lat,
                lon,
                windKt: p.MAXWIND,
                gustKt: p.GUST,
                mslp: p.MSLP === MISSING ? null : p.MSLP,
                dir: p.TCDIR === MISSING ? null : p.TCDIR,
                speedKt: p.TCSPD === MISSING ? null : p.TCSPD,
                dateLabel: p.DATELBL || "",
                advisory: (p.ADVISNUM || "").trim(),
            });
        }
    }

    return [...byStorm.values()]
        .map((s) => ({ ...s, category: categoryForWindKt(s.windKt) }))
        .sort((a, b) => (b.windKt || 0) - (a.windKt || 0));
}

export function compassDir(deg) {
    if (deg == null) return "";
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(deg / 22.5) % 16];
}
