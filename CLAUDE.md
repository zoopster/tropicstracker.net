# CLAUDE.md — TropicsTracker.net

Project context for Claude sessions. Read this first.

## What this is

An interactive tropical weather website. Live storm map, GOES satellite, local radar, and a curated hub of NHC and academic resources, in one fast, mobile-friendly site. Hurricane weather first.

This is the **v2 static-first rebuild**. The v1 LAMP/PHP app is archived in `/legacy` for reference only.

## The one rule that shapes everything: pure static, no backend

There is no server, no PHP, no build step, and no API keys. The site deploys to Netlify as plain files.

Consequence: **every data source must be CORS-enabled and key-free**, or consumed as an embed, iframe, or hotlinked image. If a source needs a hidden key or a proxy, do not add a backend. Either find a CORS-safe equivalent or link out to it from the Resource Hub instead.

The v1 PHP proxy existed only to defeat CORS and hide keys. Do not reintroduce that pattern.

## Architecture

```
index.html            App shell (header, nav, section outlet, footer)
css/styles.css        Design tokens (CSS variables) + layout
js/app.js             Section registry + hash router; nav builds itself
js/ui.js              Shared render helpers (sectionHead, placeholder, esc)
js/data/resources.js  Curated resource link data
js/sections/*.js      One module per section
netlify.toml          Static deploy config + headers; redirects /legacy away
legacy/               Archived v1 (do not deploy, do not edit)
docs/                 PRD, sprint summaries, setup guides
.claude/launch.json   Local preview server config (python static server)
```

### Section module contract
Each file in `js/sections/` default-exports:
```js
export default {
  id: "track",            // hash route and key
  label: "Track",         // nav label
  icon: "fa-map-marked-alt", // Font Awesome class
  render() { return "<html string>"; }, // required, returns markup
  mount(rootEl) { /* optional: wire up events after render */ },
};
```
To add a section: create the module, import it in `js/app.js`, add it to the `sections` array. The nav and routing pick it up automatically.

### Conventions
- Vanilla JS ES modules. No framework unless state genuinely outgrows this (revisit, do not assume).
- Escape any dynamic string before injecting into `innerHTML` with `esc()` from `js/ui.js`.
- Keep design tokens in CSS variables in `:root`. Do not hardcode colors in components.
- Leaflet for maps (planned Sprint 1) with free base tiles (OpenStreetMap or Carto). No Mapbox key.

## Approved data sources (CORS-safe, key-free)

| Need | Source | Method |
| --- | --- | --- |
| Active storms, cone, track, watches | **Esri Living Atlas "Active Hurricanes"** FeatureServer (`services9.arcgis.com/RHVPKKiFTONKtxq3/.../Active_Hurricanes_v1`) | `fetch` GeoJSON (`f=geojson`) — used in Sprint 1 |
| (alt) per-storm NHC layers | NHC ArcGIS REST (`mapservices.weather.noaa.gov/tropical/NHC_tropical_weather`) | fetch JSON; per-slot (AT1-5, EP1-5, CP1-5), heavier |
| Alerts and warnings | `api.weather.gov/alerts/active` | fetch JSON |
| Animated radar | RainViewer API (`api.rainviewer.com`) | Leaflet tile overlay |
| Official NEXRAD radar | Iowa Environmental Mesonet (IEM) | Leaflet WMS/tiles |
| GOES satellite (interactive) | RAMMB SLIDER (CIRA) | iframe embed |
| GOES satellite (stills) | NOAA NESDIS STAR CDN (`cdn.star.nesdis.noaa.gov`) | hotlinked img |
| Base map tiles | OpenStreetMap / Carto | Leaflet tile layer |
| Place search (geocoding) | Open-Meteo (`geocoding-api.open-meteo.com`) | `fetch` JSON; no key, CORS-clean |

Avoid `nhc.noaa.gov/CurrentStorms.json` from the browser; it commonly lacks CORS. Use NHC ArcGIS REST instead.

## Run locally

No build step. ES modules require a server (not `file://`):
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
Or use the Claude preview tooling with `.claude/launch.json` (server name `static`).

## Sprint roadmap

See `docs/2026-06-22-tropicstracker-prd.md` for the full PRD.

- [x] **Sprint 0** — Foundation: shell, routing, theme, Resource Hub, Netlify config.
- [x] **Sprint 1** — Live storm tracking map: Leaflet + Carto dark tiles, NHC/JTWC data via Esri Living Atlas (cone, forecast/observed track, category-colored points, current-position markers, watches/warnings), storm list panel, popups, refresh + auto-refresh, empty/error states. CORS spike passed.
- [x] **Sprint 2** — Local radar: animated RainViewer loop (`api.rainviewer.com`), NWS NEXRAD toggle (Iowa Mesonet `mesonet.agron.iastate.edu`), geolocation, place search (Open-Meteo geocoding), opacity control. Shared map helper (`js/map.js`) extracted and reused by Track. All CORS-clean. **Both sources animate via one generic frame engine in `js/sections/radar.js`; NEXRAD frames use time-stamped IEM tiles `ridge::USCOMP-N0Q-<YYYYMMDDHHMM>` (UTC, 5-min steps). See issue #7.**
- [x] **Sprint 3** — GOES satellite: native NESDIS still-image viewer (`cdn.star.nesdis.noaa.gov`), 5 tropical regions (GOES-19 East + GOES-18 West), GeoColor/Band 13 IR/Band 09 water vapor, auto-refresh, deep links to SLIDER + NESDIS loops. **Note: RAMMB SLIDER sends `X-Frame-Options: SAMEORIGIN` and cannot be iframed; deep-link out to it instead.**
- [x] **Sprint 4** — NWS alerts tied to location: site-wide alert banner (`js/alerts-banner.js`) from `api.weather.gov/alerts/active`, severity-colored, geolocation or place search, expandable cards; alert polygons overlaid on the Track map. Shared location module (`js/location.js`, localStorage + `tt-location-change` event) keeps banner and map in sync. **Note: the alerts API rejects `limit` combined with `point`. Many alerts are zone-based with no inline geometry, so only inline-polygon alerts appear on the map.**
- [x] **Sprint 5** — Learn content (`js/sections/learn.js`: hurricane formation, Saffir-Simpson scale color-coded with category tokens, storm surge, preparation), plus polish: global `:focus-visible` styles, SEO meta (canonical, theme-color, robots). **Note: the alert banner is `position: relative` (in flow), not sticky — sticky overlapped the section heading.**

All six PRD sprints are complete.

MVP = Sprints 0 + 1 + 2.

## Do not
- Do not add a backend, server runtime, or API keys.
- Do not edit or deploy anything in `/legacy`.
- Do not commit secrets. There should be none in this project by design.
- Do not commit the user's working file `⏺ 🌀 TropicsTracker.yaml` (a personal dev note) as part of feature commits.

## Owner preferences (from global config)
No em dashes (use commas, periods, or parentheses). Oxford comma. US English. No emojis unless asked. Scannable, ADHD-friendly formatting. Save deliverables as `YYYY-MM-DD-topic.ext`.
