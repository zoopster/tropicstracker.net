# TropicsTracker.net 🌀

Interactive tropical weather tracking. Live storm map, GOES satellite, local radar, and a curated hub of the best NHC and academic resources, in one fast, mobile-friendly site.

This is the **v2 static-first rebuild**. It is a pure static site (HTML, CSS, vanilla JS modules) with no backend, designed to deploy to Netlify. The previous LAMP/PHP version is archived in [`/legacy`](legacy/) for reference.

## Status

Built in short sprints. See the PRD: [docs/2026-06-22-tropicstracker-prd.md](docs/2026-06-22-tropicstracker-prd.md).

- [x] **Sprint 0** — Foundation: static shell, hash routing, dark theme, Resources hub, Netlify config.
- [x] **Sprint 1** — Live storm tracking map: Leaflet map with active storms, cones, tracks, and a storm list, from NHC/JTWC data via the Esri Living Atlas service.
- [ ] **Sprint 2** — Local radar (RainViewer + Iowa Mesonet NEXRAD).
- [ ] **Sprint 3** — GOES satellite (RAMMB SLIDER + NESDIS).
- [ ] **Sprint 4** — NWS alerts tied to location.
- [ ] **Sprint 5** — Learn content + accessibility/perf polish.

## Architecture

Pure static. Every data source must be CORS-enabled and key-free (no proxy). See the PRD data table for the approved sources.

```
index.html            App shell (header, nav, section outlet, footer)
css/styles.css        Design tokens + layout
js/app.js             Section registry + hash router
js/ui.js              Shared render helpers
js/data/resources.js  Curated resource links
js/sections/*.js      One module per section (track, radar, satellite, resources, learn)
netlify.toml          Static deploy config + headers
legacy/               Archived v1 (PHP proxy, old app) — not deployed
docs/                 PRD and planning
```

Each section is a self-contained module exporting `{ id, label, icon, render(), mount?(el) }`. Adding a section is just creating a module and registering it in `js/app.js`; the nav builds itself.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(A plain `file://` open will not work because the app uses ES modules.)

## Deploy

Hosted on **Netlify** (static, no build command). Connect the repo and Netlify uses `netlify.toml`. The `/legacy` folder is redirected away from the public site.

## Data sources

NHC, NWS (`api.weather.gov`), RainViewer, Iowa Environmental Mesonet, NOAA NESDIS, RAMMB SLIDER (CIRA), and the academic resources in the hub. All public. See the PRD for CORS notes.

## Disclaimer

For informational purposes only. Always consult the National Hurricane Center, your local National Weather Service office, and local emergency management for official forecasts, warnings, and evacuation orders.
