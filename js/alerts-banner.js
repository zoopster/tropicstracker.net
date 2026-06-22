// Site-wide weather alert banner. Tied to the user's location, but never
// auto-prompts: it only auto-loads if geolocation permission is already granted,
// otherwise it offers a button. Lives outside the section outlet so it persists
// across navigation.

import { fetchAlerts, severityMeta, expiresLabel } from "./data/alerts.js";
import { esc } from "./ui.js";
import {
    getStoredLocation,
    setStoredLocation,
    geolocate,
    geoPermissionState,
} from "./location.js";

let el = null;
let expanded = false;
let alerts = [];

export async function initAlertBanner() {
    el = document.getElementById("alert-banner");
    if (!el) return;

    const stored = getStoredLocation();
    const perm = await geoPermissionState();

    if (stored) {
        loadFor(stored);
    } else if (perm === "granted") {
        useMyLocation();
    } else {
        renderIdle();
    }
}

function show(html) {
    el.innerHTML = html;
    el.hidden = false;
    wire();
}

function renderIdle() {
    show(`
        <div class="ab-inner ab-idle">
            <span class="ab-msg"><i class="fas fa-bell" aria-hidden="true"></i> See active weather alerts for your area.</span>
            <form class="ab-search" id="ab-search">
                <input type="search" id="ab-place" placeholder="city or ZIP" aria-label="Search location for alerts">
            </form>
            <button class="btn" id="ab-locate"><i class="fas fa-location-crosshairs" aria-hidden="true"></i> Use my location</button>
            <button class="ab-x" id="ab-dismiss" aria-label="Dismiss">&times;</button>
        </div>`);
}

async function useMyLocation() {
    show(`<div class="ab-inner"><span class="ab-msg"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Finding your location...</span></div>`);
    try {
        const loc = await geolocate();
        setStoredLocation(loc);
        loadFor(loc);
    } catch {
        renderError("Location unavailable. Try searching instead.");
    }
}

async function searchLocation(query) {
    if (!query) return;
    show(`<div class="ab-inner"><span class="ab-msg"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Searching...</span></div>`);
    try {
        const { geocode } = await import("./data/radar.js");
        const hit = await geocode(query);
        if (!hit) return renderError(`No match for "${query}".`);
        const loc = { lat: hit.lat, lon: hit.lon, label: hit.label };
        setStoredLocation(loc);
        loadFor(loc);
    } catch {
        renderError("Search unavailable.");
    }
}

async function loadFor(loc) {
    show(`<div class="ab-inner"><span class="ab-msg"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Checking alerts for ${esc(loc.label)}...</span></div>`);
    try {
        alerts = await fetchAlerts({ lat: loc.lat, lon: loc.lon });
        render(loc);
    } catch {
        renderError("Could not load alerts. Try again later.");
    }
}

function render(loc) {
    if (!alerts.length) {
        show(`
            <div class="ab-inner ab-clear">
                <span class="ab-msg"><i class="fas fa-circle-check" aria-hidden="true"></i> No active alerts near ${esc(loc.label)}.</span>
                <button class="ab-link" id="ab-change">change</button>
                <button class="ab-x" id="ab-dismiss" aria-label="Dismiss">&times;</button>
            </div>`);
        return;
    }

    const top = alerts[0];
    const meta = severityMeta(top.severity);
    const more = alerts.length > 1 ? ` +${alerts.length - 1} more` : "";

    show(`
        <div class="ab-strip" style="--sev:var(${meta.color});${meta.dark ? "color:#fff" : ""}">
            <button class="ab-head" id="ab-toggle" aria-expanded="${expanded}">
                <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                <strong>${esc(top.event)}</strong>${esc(more)}
                <span class="ab-loc">near ${esc(loc.label)}</span>
                <i class="fas fa-chevron-${expanded ? "up" : "down"} ab-caret" aria-hidden="true"></i>
            </button>
            <button class="ab-link" id="ab-change">change</button>
            <button class="ab-x" id="ab-dismiss" aria-label="Dismiss">&times;</button>
        </div>
        <div class="ab-list" ${expanded ? "" : "hidden"}>
            ${alerts.map(cardHtml).join("")}
        </div>`);
}

function cardHtml(a) {
    const meta = severityMeta(a.severity);
    return `
        <article class="alert-card" style="border-left-color:var(${meta.color})">
            <header>
                <span class="sev-pill" style="background:var(${meta.color});${meta.dark ? "color:#fff" : ""}">${esc(a.severity)}</span>
                <strong>${esc(a.event)}</strong>
            </header>
            <p class="alert-area">${esc(a.areaDesc)}</p>
            ${a.headline ? `<p class="alert-headline">${esc(a.headline)}</p>` : ""}
            <p class="alert-expires">${esc(expiresLabel(a.expires))}</p>
        </article>`;
}

function renderError(msg) {
    show(`
        <div class="ab-inner">
            <span class="ab-msg"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ${esc(msg)}</span>
            <button class="btn" id="ab-locate">Use my location</button>
            <button class="ab-x" id="ab-dismiss" aria-label="Dismiss">&times;</button>
        </div>`);
}

function wire() {
    const on = (id, ev, fn) => { const n = el.querySelector("#" + id); if (n) n.addEventListener(ev, fn); };

    on("ab-locate", "click", useMyLocation);
    on("ab-dismiss", "click", () => { el.hidden = true; });
    on("ab-change", "click", renderIdle);
    on("ab-toggle", "click", () => {
        expanded = !expanded;
        const loc = getStoredLocation();
        if (loc) render(loc);
    });
    on("ab-search", "submit", (e) => {
        e.preventDefault();
        searchLocation(el.querySelector("#ab-place").value.trim());
    });
}
