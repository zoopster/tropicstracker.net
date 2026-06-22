// Shared user location: persisted in localStorage and broadcast so the alert
// banner and the Track map stay in sync. { lat, lon, label }.

const KEY = "tt-location";
export const LOCATION_EVENT = "tt-location-change";

export function getStoredLocation() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
        return null;
    }
}

export function setStoredLocation(loc) {
    try {
        localStorage.setItem(KEY, JSON.stringify(loc));
    } catch {
        /* ignore quota/availability errors */
    }
    window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: loc }));
}

// Promise wrapper around the Geolocation API.
export function geolocate({ timeout = 8000 } = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("unsupported"));
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" }),
            (err) => reject(err),
            { timeout }
        );
    });
}

// Has the user already granted geolocation permission? Resolves to
// "granted" | "prompt" | "denied" | "unknown" (never rejects).
export async function geoPermissionState() {
    try {
        if (!navigator.permissions) return "unknown";
        const status = await navigator.permissions.query({ name: "geolocation" });
        return status.state;
    } catch {
        return "unknown";
    }
}
