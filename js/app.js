// TropicsTracker.net — app shell: section registry, nav, and hash routing.

import track from "./sections/track.js";
import radar from "./sections/radar.js";
import satellite from "./sections/satellite.js";
import resources from "./sections/resources.js";
import learn from "./sections/learn.js";
import { initAlertBanner } from "./alerts-banner.js";

const sections = [track, radar, satellite, resources, learn];
const registry = new Map(sections.map((s) => [s.id, s]));
const DEFAULT = "track";

const outlet = document.getElementById("section-outlet");
const navTabs = document.getElementById("nav-tabs");
const navToggle = document.getElementById("nav-toggle");

// Build nav from the registry so a new section only needs registering above.
function buildNav() {
    navTabs.innerHTML = sections
        .map(
            (s) =>
                `<a class="nav-tab" data-id="${s.id}" href="#${s.id}">
                    <i class="fas ${s.icon}" aria-hidden="true"></i> ${s.label}
                </a>`
        )
        .join("");
}

function setActiveTab(id) {
    navTabs.querySelectorAll(".nav-tab").forEach((tab) => {
        const active = tab.dataset.id === id;
        tab.classList.toggle("active", active);
        if (active) tab.setAttribute("aria-current", "page");
        else tab.removeAttribute("aria-current");
    });
}

function currentId() {
    const id = (location.hash || "").replace(/^#/, "");
    return registry.has(id) ? id : DEFAULT;
}

async function renderRoute() {
    const id = currentId();
    const section = registry.get(id);

    outlet.innerHTML = section.render();
    setActiveTab(id);
    document.title = `${section.label} — TropicsTracker.net`;

    if (typeof section.mount === "function") {
        try {
            await section.mount(outlet);
        } catch (err) {
            console.error(`mount failed for "${id}":`, err);
        }
    }

    // Close mobile nav after navigation; reset scroll for the new view.
    navTabs.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "auto" });
}

function init() {
    buildNav();

    navToggle.addEventListener("click", () => {
        const open = navTabs.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(open));
    });

    window.addEventListener("hashchange", renderRoute);

    // Normalize empty/unknown hash to the default route.
    if (currentId() !== (location.hash || "").replace(/^#/, "")) {
        location.replace(`#${DEFAULT}`);
    }
    renderRoute();

    // Site-wide alert banner (independent of the active section).
    initAlertBanner();
}

init();
