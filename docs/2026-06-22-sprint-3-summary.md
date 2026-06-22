# Sprint 3 Summary — GOES Satellite

**Date:** 2026-06-22
**Sprint goal:** One-click GOES satellite imagery for the tropics.
**Outcome:** Complete and verified against live imagery.

---

## Source checks and a design change

- **NOAA NESDIS STAR CDN** (`cdn.star.nesdis.noaa.gov`): hotlinkable JPGs, no key. Confirmed current paths and sizes for GOES-19 (East) and GOES-18 (West), including the tropical sectors `taw` (Tropical Atlantic), `car` (Caribbean), and `eep` (Eastern Pacific), plus CONUS and Full Disk.
- **RAMMB SLIDER**: sends `X-Frame-Options: SAMEORIGIN`, so it **cannot be iframe-embedded** from our origin. The PRD's "embed SLIDER" plan was changed accordingly.

### Resulting approach
Build a **native still-image viewer** from the NESDIS CDN (which works cleanly cross-origin in `<img>`), and **deep-link out** to the SLIDER interactive viewer and the NESDIS animated-loop pages for animation. This is more robust than an embed and keeps the page lightweight.

Note: GOES-East is now **GOES-19** (replaced GOES-16 in 2025); West is **GOES-18**. Paths use `GOES19` / `GOES18`.

---

## What was built

- **`js/data/satellite.js`** (new): view config (5 tropical regions), product config (GeoColor, Band 13 infrared, Band 09 water vapor), and URL builders for the latest still image (with cache-busting), the SLIDER deep link, and the NESDIS loop page.
- **`js/sections/satellite.js`** (rewritten from placeholder): segmented controls for region and product; latest-image display with loading and error states; auto-refresh every 5 minutes; outbound "Interactive viewer" (SLIDER) and "Animated loop" (NESDIS) links that track the current selection; a caption with region, product, and satellite.
- **`css/styles.css`**: segmented-control and image-stage styles.

---

## Verification (local preview, live imagery)

| Check | Result |
| --- | --- |
| Default view loads real imagery | Pass (Tropical Atlantic GeoColor, GOES-19, 900x540) |
| Region switch (incl. GOES-18 East Pacific) | Pass |
| Product switch (GeoColor / IR / Water Vapor) | Pass (e.g. East Pacific Band 13 loaded) |
| SLIDER deep link is correct per selection | Pass (`sat`, `sec`, product mapped) |
| NESDIS loop link is correct per selection | Pass (sector_band.php for sectors) |
| Caption reflects region / product / satellite | Pass |
| Loading and error states | Implemented (`onload` / `onerror`) |
| Auto-refresh wired | Pass |
| Console errors or warnings | None |

---

## Acceptance criteria (from PRD)

| Criterion | Status |
| --- | --- |
| View current GOES imagery without leaving the site | Met (native NESDIS still viewer) |
| Quick picks for GeoColor, infrared, water vapor | Met |
| Jump to the full interactive viewer in one click | Met (SLIDER deep link; SLIDER cannot be embedded) |

---

## Notes and carryover
- A built-in animation could be added later by cycling recent timestamped NESDIS frames; for now animation is via the outbound SLIDER and NESDIS loop pages.
- Next: Sprint 4 (NWS alerts tied to location), which can reuse the Track map and the Open-Meteo/geolocation helpers from Sprint 2.
