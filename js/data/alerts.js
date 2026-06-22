// Active weather alerts from the NWS API (api.weather.gov), key-free and CORS-clean.
// Query by point (lat,lon) or by US state area code. Note: the API rejects
// `limit` combined with `point`, so we do not send it.

const API = "https://api.weather.gov/alerts/active";

// Severity styling and ordering. `color` is a CSS custom property name.
export const SEVERITY = {
    Extreme: { rank: 4, color: "--sev-extreme", dark: true },
    Severe: { rank: 3, color: "--sev-severe", dark: false },
    Moderate: { rank: 2, color: "--sev-moderate", dark: false },
    Minor: { rank: 1, color: "--sev-minor", dark: true },
    Unknown: { rank: 0, color: "--sev-unknown", dark: false },
};

export function severityMeta(sev) {
    return SEVERITY[sev] || SEVERITY.Unknown;
}

function parse(geojson) {
    return (geojson.features || [])
        .map((f) => {
            const p = f.properties || {};
            return {
                id: p.id || f.id,
                event: p.event || "Weather Alert",
                severity: p.severity || "Unknown",
                urgency: p.urgency || "",
                headline: p.headline || "",
                areaDesc: p.areaDesc || "",
                expires: p.expires || null,
                description: p.description || "",
                instruction: p.instruction || "",
                geometry: f.geometry || null,
            };
        })
        .sort((a, b) => {
            const r = severityMeta(b.severity).rank - severityMeta(a.severity).rank;
            if (r !== 0) return r;
            return (a.expires || "").localeCompare(b.expires || "");
        });
}

export async function fetchAlerts({ lat, lon, area } = {}) {
    const qs = area ? `area=${encodeURIComponent(area)}` : `point=${lat},${lon}`;
    const res = await fetch(`${API}?${qs}`, { headers: { Accept: "application/geo+json" } });
    if (!res.ok) throw new Error(`Alerts HTTP ${res.status}`);
    return parse(await res.json());
}

export function expiresLabel(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return `Expires ${d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}
