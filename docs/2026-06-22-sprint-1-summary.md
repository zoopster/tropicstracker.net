# Sprint 1 Summary — Live Storm Tracking Map

**Date:** 2026-06-22
**Sprint goal:** Real active tropical systems on an interactive map (position, forecast track, cone).
**Outcome:** Complete and verified against live data.

---

## CORS spike result (decision gate passed)

The pure-static approach is validated. Both candidate endpoints return CORS headers, so no proxy or backend is needed:
- `api.weather.gov` returns `access-control-allow-origin: *`.
- The chosen storm service (Esri Living Atlas "Active Hurricanes") returns `access-control-allow-origin: *` on its query endpoint, verified with an actual GeoJSON layer query, not just the service root.

### Data source chosen
Rather than the per-storm NHC ArcGIS service (slots AT1-5, EP1-5, CP1-5, which require many queries), Sprint 1 uses the **Esri Living Atlas "Active Hurricanes" FeatureServer**, which consolidates all active storms into single layers:
- Forecast Position (0), Observed Position (1), Forecast Track (2), Observed Track (3), Forecast Error Cone (4), Watches and Warnings (5).

Consumed as GeoJSON via `f=geojson`, so Leaflet is the only runtime dependency.

---

## What was built

- **`js/data/storms.js`** — data layer: parallel layer fetch with graceful per-layer failure, GeoJSON parsing, Saffir-Simpson classification from knots, knots-to-mph and compass-direction helpers, and a `summarizeStorms()` reducer that yields one current-position summary per storm (sorted strongest first).
- **`js/sections/track.js`** — the live section: Leaflet map with Carto dark tiles; renders the cone, observed and forecast tracks, category-colored forecast points, and larger current-position markers; a storm list panel (click to fly-to and open popup); manual Refresh and a 10-minute auto-refresh; a category legend; and empty and error states.
- **`index.html`** — Leaflet CSS/JS via CDN with SRI hashes.
- **`css/styles.css`** — map, panel, storm-item, marker, and legend styles, responsive (panel stacks under the map on mobile).

---

## Verification (local preview, live data)

Two systems were active during testing (Mekkhala and Eight), so the live path was exercised end to end.

| Check | Result |
| --- | --- |
| Map initializes, Carto tiles load | Pass |
| Active storms fetched and listed | Pass (2 storms) |
| Cone, tracks, and points render | Pass |
| Current-position markers colored by category | Pass |
| Popup data and unit conversion | Pass (Mekkhala: 144 mph / 125 kt, Cat 4) |
| Stationary movement label | Pass |
| Storm list click flies to storm and opens popup | Pass |
| Re-mount after navigating away and back | Pass (single map, no leak) |
| Console errors or warnings | None |

Empty and error states are implemented and code-reviewed; they could not be triggered visually while storms were active.

---

## Acceptance criteria

| Criterion (from PRD / Sprint 1 plan) | Status |
| --- | --- |
| Active system shows correct position, track, and cone | Met |
| Off-season shows a friendly empty state | Implemented (not visually triggered; storms were active) |
| Works on mobile | Met (responsive layout verified at narrow width) |
| No console errors; graceful degradation | Met (per-layer failures degrade to empty) |

---

## Notes and carryover
- Movement direction and speed come from the advisory synoptic point; some feeds report 0 (rendered as "Stationary") or a missing sentinel (rendered as "n/a").
- Watches and warnings are drawn with a single highlight style; richer per-type coloring is a future polish.
- Next: Sprint 2 (local radar) can reuse this map instance and add RainViewer and IEM NEXRAD overlays plus geolocation.
