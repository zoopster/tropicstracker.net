// Shared Leaflet helpers used by the Track and Radar sections.

// Resolve a CSS custom property to its computed value (with a safe fallback).
export function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

// Leaflet is loaded via a deferred CDN script; navigation can beat it.
export function whenLeafletReady() {
    return new Promise((resolve) => {
        if (window.L) return resolve();
        const t = setInterval(() => {
            if (window.L) { clearInterval(t); resolve(); }
        }, 50);
    });
}

// Carto dark base tiles, no key required.
export function baseTileLayer() {
    return L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
    });
}

// Create a map with the base layer already attached.
export function createMap(el, opts = {}) {
    const map = L.map(el, { worldCopyJump: true, ...opts });
    baseTileLayer().addTo(map);
    return map;
}
