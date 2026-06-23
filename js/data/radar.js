// Radar data sources, all CORS-enabled and key-free.
// - RainViewer: animated global radar (past + nowcast frames).
// - Iowa Environmental Mesonet (IEM): official NWS NEXRAD composite (US).
// - Open-Meteo geocoding: location search fallback.

const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";

/**
 * Fetch the RainViewer frame index. Returns the tile host and an ordered list
 * of frames (observed past frames followed by any nowcast frames).
 */
export async function fetchRainviewerFrames() {
    const res = await fetch(RAINVIEWER_INDEX);
    if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    const data = await res.json();
    const radar = data.radar || {};
    const past = radar.past || [];
    const nowcast = radar.nowcast || [];
    const frames = [...past, ...nowcast].map((f) => ({
        time: f.time,
        path: f.path,
        forecast: !past.includes(f),
    }));
    return { host: data.host, frames };
}

// Build a RainViewer XYZ tile template for one frame.
// color 4 = "Universal Blue"; options "1_1" = smooth + show snow.
export function rainviewerTileUrl(host, path) {
    return `${host}${path}/256/{z}/{x}/{y}/4/1_1.png`;
}

// IEM NEXRAD base reflectivity (N0Q) US composite as time-stamped XYZ tiles.
// The `ridge::USCOMP-N0Q-<YYYYMMDDHHMM>` (UTC, 5-minute steps) form supports
// animation; tiles for unpublished/old times simply 404 and render blank.
const pad = (n) => String(n).padStart(2, "0");

function utcStamp(ms) {
    const d = new Date(ms);
    return (
        d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes())
    );
}

// XYZ tile template for a single NEXRAD frame at a given time (ms epoch).
export function nexradTileUrl(timeMs) {
    return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::USCOMP-N0Q-${utcStamp(timeMs)}/{z}/{x}/{y}.png`;
}

// Ordered list (oldest to newest) of recent 5-minute NEXRAD frame times.
// `lagMin` skips the most recent marks, which may not be published yet.
export function nexradFrameTimes(count = 12, lagMin = 5) {
    const step = 5 * 60 * 1000;
    const latest = Math.floor((Date.now() - lagMin * 60 * 1000) / step) * step;
    const times = [];
    for (let i = count - 1; i >= 0; i--) times.push(latest - i * step);
    return times;
}

export const IEM_ATTRIBUTION =
    'Radar &copy; <a href="https://mesonet.agron.iastate.edu/">Iowa Environmental Mesonet</a> (NWS NEXRAD)';
export const RAINVIEWER_ATTRIBUTION =
    'Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>';

/**
 * Geocode a place name to a coordinate using Open-Meteo (no key, CORS-enabled).
 * Returns { lat, lon, label } or null if nothing matched.
 */
export async function geocode(query) {
    const url =
        "https://geocoding-api.open-meteo.com/v1/search?" +
        new URLSearchParams({ name: query, count: "1", language: "en", format: "json" });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
    const data = await res.json();
    const hit = (data.results || [])[0];
    if (!hit) return null;
    const label = [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(", ");
    return { lat: hit.latitude, lon: hit.longitude, label };
}
