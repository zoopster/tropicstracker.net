# TropicsTracker.net PRD

**Date:** 2026-06-22
**Author:** John Pugh
**Status:** Draft for sprint planning
**Scope of this doc:** Plan only. No code in this pass.

---

## 1. Vision

An interactive, fast, no-nonsense website for viewing weather, starting with tropical/hurricane weather. It pulls the best official and academic sources (NHC, GOES satellites, local radar) into one clean interface so a user can answer "what is happening, where, and how bad" in seconds, without bouncing between a dozen bookmarks.

The current `sources.html` (a curated link directory) proves the demand: people already keep long lists of these resources. TropicsTracker turns that list into a live, interactive product.

---

## 2. Goals and non-goals

### Goals
- Show **live active storms** on an interactive map (position, category, cone, track).
- Give **one-click access** to authoritative imagery: GOES satellite and local NEXRAD radar.
- Keep the curated **resource hub** as a backbone for everything not yet built natively.
- Be **fast, mobile-friendly, and cheap to host**.
- Ship in **short, demoable sprints**, one section coming to life at a time.

### Non-goals (for now)
- No user accounts, login, or saved preferences (beyond browser localStorage).
- No custom forecast modeling. We display official model output, we do not compute it.
- No push notifications in the MVP (backlog item).
- No native mobile app (responsive web only).
- No paid APIs or secret keys in the MVP (see constraints).

---

## 3. Target users

| Persona | Need | What they want from us |
| --- | --- | --- |
| **Coastal resident** | "Is this storm coming for me, and when?" | Live map, cone, plain-language alerts, local radar. |
| **Weather enthusiast** | Deep model and satellite access | SLIDER/GOES viewers, model guidance links, spaghetti tracks. |
| **Casual checker** | Quick glance during the season | Fast load, clear "active systems" summary, no clutter. |

Primary persona for MVP: **coastal resident**. Sprint 1 serves them directly.

---

## 4. Guiding constraints (decided)

1. **Static-first MVP.** Treat existing v1 (`index.html` app + PHP proxy) as reference, not foundation. Ship a lean static site, then layer in live data.
2. **Pure static, no backend.** No PHP proxy, no server. This is the most important architectural decision and it dictates the data sources.
3. **Consequence:** every data source must be **CORS-enabled and key-free**, or consumed as an **embed/iframe/hotlinked image**. Anything that needs a hidden key or a proxy is out of scope for now and gets linked to instead (via the resource hub).

> **Why this matters:** The old PHP proxy existed only to defeat browser CORS and hide keys. Going pure static means we route around both by choosing sources that already permit browser access. The PRD's data table below is built entirely from such sources.

---

## 5. Information architecture

A single-page app with a persistent top nav. Sections (tabs):

1. **Track** (default): live map, active storm list, alerts. *(Sprint 1)*
2. **Satellite**: GOES viewers and imagery. *(Sprint 3)*
3. **Radar**: local NEXRAD radar, geolocated. *(Sprint 2)*
4. **Resources**: curated hub from `sources.html`, restyled to match. *(Sprint 0/4)*
5. **Learn**: hurricane basics, Saffir-Simpson scale, prep guidance. *(Sprint 5, port from v1)*

Deep links: each section is addressable via hash route (e.g. `#radar`) so links are shareable.

---

## 6. Tech stack (proposed)

- **Core:** HTML, modern vanilla JS (ES modules), CSS. No framework required for MVP. Reconsider a framework only if state grows unmanageable.
- **Map:** Leaflet (already in use) + free base tiles (OpenStreetMap or Carto). **Drops the Mapbox key requirement.**
- **Build/host:** Plain static files on any static host (GitHub Pages, Cloudflare Pages, Netlify free tier). No build step required initially; add Vite later only if needed.
- **Data fetching:** native `fetch` against CORS-enabled endpoints. Small client-side cache in `localStorage`/memory with TTLs.
- **Icons/fonts:** keep Font Awesome (CDN) for continuity, or swap to inline SVG to cut a dependency.

---

## 7. Data sources (CORS-safe / key-free)

This table is the heart of the "pure static" feasibility check. Each row is browser-reachable without a proxy.

| Need | Source | Access method | Key? | CORS | Notes |
| --- | --- | --- | --- | --- | --- |
| Active storms, cone, track, watches/warnings | **NHC ArcGIS REST** (`mapservices.weather.noaa.gov/tropical`) | `fetch` JSON / Leaflet Esri layer | No | Yes | Preferred live source. Layers for cone, line, points, watch/warn. |
| Active storm summary (fallback) | NHC `CurrentStorms.json` | `fetch` | No | **No (risky)** | Often lacks CORS. Use only if a CORS-friendly mirror is found; otherwise rely on ArcGIS. |
| Weather alerts/warnings | **`api.weather.gov/alerts/active`** | `fetch` JSON | No | Yes | Free NWS API. Filter by area/point. Set a descriptive `User-Agent` where possible. |
| Local radar (animated) | **RainViewer API** (`api.rainviewer.com`) | tile overlay on Leaflet | No | Yes | Past + nowcast frames, easy loop control. Great primary radar layer. |
| Local radar (official NEXRAD) | **Iowa Environmental Mesonet (IEM)** WMS/tiles | Leaflet tile/WMS layer | No | Yes | NOAA NEXRAD composite, authoritative, free. |
| GOES satellite imagery | **RAMMB SLIDER (CIRA)** | iframe embed / deep link | No | n/a (embed) | Best interactive satellite viewer; embed per sector. |
| GOES satellite stills/loops | **NESDIS STAR GOES CDN** (`cdn.star.nesdis.noaa.gov`) | hotlinked `<img>` | No | Yes | Latest-image URLs per sector/band for lightweight tiles. |
| Base map tiles | OpenStreetMap / Carto | Leaflet tile layer | No | Yes | Respect tile usage policy; Carto for dark theme. |
| Model guidance, university tools | Existing `sources.html` set | external links | No | n/a | Stays as curated links until/if natively integrated. |

**Action item before Sprint 1:** validate the two highest-risk rows live in a browser, NHC ArcGIS REST and `api.weather.gov`, confirming CORS headers and response shape. This is the single biggest technical risk and a 30-minute spike de-risks the whole plan.

---

## 8. Sprint plan

Short sprints, roughly one week each, each ending in something demoable. Sprint 1 brings the **live storm tracking map** to life, per decision.

### Sprint 0 — Foundation and shell (setup)
- **Goal:** A clean static skeleton deployed and navigable.
- **Scope:**
  - New static project structure (`index.html`, `/js`, `/css`, `/assets`). Keep old v1 files untouched as reference.
  - Top nav + hash routing between empty section placeholders.
  - Responsive layout shell, dark theme, base styling tokens.
  - Restyle `sources.html` content into the **Resources** section (content already exists, just needs to fit the shell).
  - Deploy to static host; confirm live URL.
- **Acceptance:** Site loads under 2s, all tabs switch via hash, Resources section is fully usable, deployed and public.

### Sprint 1 — Live storm tracking map (flagship)
- **Goal:** Real active storms on an interactive map.
- **Pre-work:** the CORS spike from Section 7.
- **Scope:**
  - Leaflet map with OSM/Carto base tiles, basin-aware default view.
  - Pull active storms from **NHC ArcGIS REST**: plot current points, forecast track, and the cone of uncertainty.
  - Color storm markers by Saffir-Simpson category.
  - Side panel: list of active systems (name, category, wind, movement); click to fly-to.
  - Empty state when no active storms ("No active tropical systems. Off-season? Here is where to watch.").
  - Last-updated timestamp + manual refresh; auto-refresh on a TTL.
- **Acceptance:** During an active system, the map shows correct position, track, and cone matching NHC. Off-season shows a correct, friendly empty state. Works on mobile.

### Sprint 2 — Local radar
- **Goal:** "What is happening over me right now."
- **Scope:**
  - RainViewer tile overlay on the same Leaflet map with play/pause loop and timestamp.
  - Optional IEM NEXRAD layer as an "official" toggle.
  - Geolocation (with permission) to center on the user; manual location search fallback.
  - Opacity control (reuse the v1 pattern).
- **Acceptance:** User can see animated radar over their location, scrub the loop, and toggle radar on/off over the storm map.

### Sprint 3 — Satellite (GOES)
- **Goal:** One-click satellite imagery.
- **Scope:**
  - Satellite section with embedded RAMMB SLIDER for the relevant basin/sector.
  - Quick-pick buttons (GeoColor, IR, water vapor) that deep-link SLIDER or swap NESDIS CDN images.
  - Lightweight "latest image" thumbnails from NESDIS CDN for fast preview before opening the full viewer.
- **Acceptance:** User can view current GOES imagery for their basin without leaving the site, and jump to the full interactive viewer in one click.

### Sprint 4 — Alerts and "near me" integration
- **Goal:** Plain-language warnings tied to location.
- **Scope:**
  - `api.weather.gov/alerts/active` filtered by the user's point/zone.
  - Alert cards with severity color, headline, and plain-language summary.
  - Surface relevant alerts in both the Track section and a dedicated banner.
  - Wire alerts to the map (highlight affected zones if feasible via ArcGIS layers).
- **Acceptance:** Active NWS alerts for the user's area appear, correctly colored by severity, with source links.

### Sprint 5 — Learn and polish
- **Goal:** Round out the product and harden it.
- **Scope:**
  - Port educational content from v1 (formation, Saffir-Simpson, storm surge, prep checklist).
  - Accessibility pass (keyboard nav, ARIA, contrast), SEO/meta, social cards.
  - Performance pass (lazy-load map/satellite, cache tuning).
  - Error/empty/loading states audit across all sections.
- **Acceptance:** Lighthouse: Performance and Accessibility both 90+. All sections have graceful loading and error states.

---

## 9. MVP definition

**MVP = Sprint 0 + Sprint 1 + Sprint 2.**
A deployed static site where a user can see live storms with cones on a map, view animated radar over their location, and reach every other resource through the curated hub. That alone is genuinely useful and shippable in roughly three weeks.

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| NHC ArcGIS or NWS endpoints lack CORS in practice | Blocks pure-static live tracking | Spike in Sprint 1 pre-work. If blocked, fall back to a tiny serverless function (Cloudflare Worker) for just that call, kept out of the static deploy. |
| Off-season (now: June, season ramping) means little live data to test | Hard to validate visually | Use NHC archived/sample storms and ArcGIS historical layers for dev; build a "demo storm" toggle. |
| Hotlinking imagery against source terms of use | Broken images, bad etiquette | Prefer official embeds (SLIDER) and documented image CDNs; cache thumbnails lightly; credit sources. |
| Tile usage limits (OSM/RainViewer) | Throttling at scale | Use Carto/permitted tiles, sane refresh TTLs, attribution. Revisit if traffic grows. |
| Scope creep from the huge resource list | Sprints slip | Resource hub stays as links; native integration is explicitly backlog, not sprint scope. |

---

## 11. Success metrics

- **Time to first useful answer:** under 5 seconds from load to seeing active storms.
- **Performance:** Lighthouse Performance 90+, first load under 2s on 4G.
- **Coverage:** 100% of MVP sections have working live data or a correct empty state.
- **Reliability:** graceful degradation (never a blank screen) when any single source fails.
- **Engagement (later):** return visits during active events, time on Track section.

---

## 12. Backlog (post-MVP)

- Push notifications / alert subscriptions (requires backend or a service like web-push).
- Spaghetti model overlays natively (vs links).
- Historical storm archive and search (HURDAT2).
- Multi-basin quick switcher (Atlantic, E/W Pacific, Indian).
- Saved locations and preferences.
- PWA/offline support.
- Native model guidance integration for select sources.

---

## 13. Open questions

1. Domain/hosting: stay on the current LAMP host serving static files, or move to Cloudflare/Netlify Pages? (Recommend Pages for free CDN + easy deploys.)
2. Do we retire the old v1 files and proxy from the repo, or keep them archived in a `/legacy` folder?
3. Default map basin: detect from user geolocation, or default to Atlantic?
4. Branding: keep current look, or refresh visual identity during Sprint 0?

---

## Next actions

1. **Confirm hosting target** (open question 1) so Sprint 0 can deploy.
2. **Run the CORS spike** on NHC ArcGIS REST + `api.weather.gov` (Sprint 1 pre-work, ~30 min). This validates the entire pure-static approach.
3. **Approve this PRD**, then start Sprint 0 (foundation + Resources section).
