# Sprint 1 Plan — Live Storm Tracking Map

**Goal:** Real active tropical systems on an interactive map: current position, forecast track, and the cone of uncertainty, with NWS alerts layered in.
**Section:** `js/sections/track.js` (currently a placeholder).
**Depends on:** Sprint 0 foundation (done).

---

## Step 0: CORS spike (do this first, ~30 min)

The entire pure-static approach hinges on two endpoints returning data to the browser with CORS headers. Validate before building anything.

1. **NHC ArcGIS REST** — confirm the tropical services respond to a browser `fetch` with JSON and `Access-Control-Allow-Origin`.
   - Base: `https://mapservices.weather.noaa.gov/tropical/rest/services`
   - Identify the active-storm layers (cone, forecast track line, points, watches and warnings).
2. **NWS alerts** — confirm `https://api.weather.gov/alerts/active` works from the browser (it does in general; verify shape and any `User-Agent` expectations).

**Decision gate:**
- If both pass: build fully static (the plan below).
- If either fails: add a single Netlify Function as a thin proxy for just that call. Keep the rest static and document the exception in `CLAUDE.md`.

**Preliminary result (2026-06-22, header check):** both endpoints already send CORS headers.
- `api.weather.gov/alerts/active` returns `access-control-allow-origin: *`.
- NHC ArcGIS REST (`mapservices.weather.noaa.gov/tropical`) reflects the request origin in `access-control-allow-origin`.

This points to "build fully static." Still confirm an actual in-browser `fetch` of a specific layer (not just a header check) during the spike, since ArcGIS layer queries can differ from the service root.

Since it is hurricane off-season-adjacent (June, season ramping), use archived or sample storms and the ArcGIS historical layers for development. Build a "demo storm" toggle so the map can be verified with no live systems.

---

## Build tasks

1. **Map scaffold**
   - Add Leaflet (CSS + JS) to `index.html`.
   - In `track.js` `render()`, output the map container and side panel; in `mount()`, initialize Leaflet with OpenStreetMap or Carto dark tiles.
   - Basin-aware default view (default Atlantic; revisit geolocation-based default later).

2. **Active storms layer**
   - Fetch from NHC ArcGIS REST.
   - Plot current position markers, forecast track, and the cone polygon.
   - Color markers by Saffir-Simpson category using the existing CSS category tokens.

3. **Storm list panel**
   - List active systems (name, category, wind, movement).
   - Click a list item to fly-to the storm on the map.

4. **Alerts overlay**
   - Pull active alerts from `api.weather.gov`; surface them in the panel and, if feasible, highlight affected zones.

5. **State and UX**
   - Empty state when there are no active storms ("No active tropical systems. Here is where to watch.").
   - Last-updated timestamp, manual refresh, and auto-refresh on a TTL.
   - Loading and error states (never a blank map).

6. **Verify**
   - Local preview: demo storm renders correctly, empty state correct, mobile layout works, no console errors.

---

## Acceptance criteria

- During an active system, the map shows correct position, track, and cone matching NHC.
- Off-season shows a correct, friendly empty state.
- Works on mobile.
- No console errors; graceful degradation if a source fails.

---

## Notes

- Reuse v1 patterns where helpful (`legacy/index.html` has a Leaflet setup and an opacity control worth referencing), but do not depend on `legacy` code or its PHP data layer.
- Keep all new logic inside `js/sections/track.js` plus small helpers; do not add a backend.
