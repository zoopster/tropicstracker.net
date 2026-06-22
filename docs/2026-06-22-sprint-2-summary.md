# Sprint 2 Summary — Local Radar

**Date:** 2026-06-22
**Sprint goal:** Animated local radar a user can see over their location.
**Outcome:** Complete and verified against live data.

---

## Source checks (all passed)

- **RainViewer** (`api.rainviewer.com/public/weather-maps.json`): `access-control-allow-origin: *`, 13 past frames, tile host `tilecache.rainviewer.com`. Tiles return `200 image/png`.
- **Iowa Environmental Mesonet NEXRAD** (`mesonet.agron.iastate.edu`, `nexrad-n0q-900913` XYZ tiles): `200 image/png`, even sends `access-control-allow-origin: *`.
- **Open-Meteo geocoding** (`geocoding-api.open-meteo.com`): no key, CORS-clean, verified in-browser ("Miami" resolved correctly).

No proxy or backend needed.

---

## What was built

- **`js/map.js`** (new shared helper): `cssVar`, `whenLeafletReady`, `baseTileLayer`, and `createMap`. Extracted from Track so both sections share one map setup. Track was refactored to use it (no behavior change).
- **`js/data/radar.js`** (new): RainViewer frame index fetch, RainViewer tile-URL builder, IEM NEXRAD tile URL and attributions, and Open-Meteo `geocode()`.
- **`js/sections/radar.js`** (rewritten from placeholder): the radar section.
  - Animated RainViewer loop using an opacity stack (one tile layer per frame, smooth stepping), autoplay, and play/pause.
  - Frame timestamp label (Observed vs Forecast).
  - Source switch: RainViewer (animated) or NWS NEXRAD (official US composite, latest), mutually exclusive.
  - "Locate me" geolocation (silent attempt on mount, explicit on button), plus place search via geocoding as the fallback.
  - Opacity slider applied to the active radar layer.
  - Leak-safe re-mount.
- **`css/styles.css`**: radar toolbar, controls, and map styles; responsive.

---

## Verification (local preview, live data)

| Check | Result |
| --- | --- |
| Track section still works after the shared-helper refactor | Pass (2 storms, single map) |
| Radar map loads with Carto base tiles | Pass |
| RainViewer frames load and animate (autoplay) | Pass (live tiles over the US) |
| Play / Pause toggle | Pass |
| NWS NEXRAD source toggle shows IEM tiles, disables play | Pass |
| Place search recenters the map | Pass ("Miami" → "Miami, Florida, US") |
| Opacity slider wired to active layer | Pass |
| Single map instance, leak-safe re-mount | Pass |
| Console errors or warnings | None |

Geolocation depends on the browser permission prompt and HTTPS; it is wired and degrades to the search box when denied or unavailable.

---

## Acceptance criteria (from PRD)

| Criterion | Status |
| --- | --- |
| Animated radar over the user's location | Met (geolocation + search to set location) |
| Scrub / loop the radar | Met (autoplay loop with play/pause) |
| Toggle radar on/off | Met (source switch incl. official NEXRAD) |

---

## Notes and carryover
- Nowcast (forecast) frames are included when RainViewer provides them; none were available at test time, so only observed frames showed.
- A manual scrub slider over frames is a possible enhancement; current control is autoplay loop plus play/pause.
- Next: Sprint 3 (GOES satellite) can add a Satellite section with RAMMB SLIDER embeds and NESDIS stills, reusing the same section-module pattern.
