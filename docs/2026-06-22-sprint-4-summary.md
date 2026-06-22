# Sprint 4 Summary — NWS Alerts Tied to Location

**Date:** 2026-06-22
**Sprint goal:** Plain-language weather warnings tied to the user's location.
**Outcome:** Complete and verified against live alerts.

---

## Source notes

- **NWS API** (`api.weather.gov/alerts/active`): key-free, `access-control-allow-origin: *`. Query by `point=lat,lon` or by US state `area`.
- Gotcha: the API returns **Bad Request when `limit` is combined with `point`**, so we do not send `limit`.
- Many alerts are **zone-based with no inline geometry** (`geometry: null`); only alerts that carry an inline polygon can be drawn on the map. The banner lists all of them regardless.

---

## What was built

- **`js/data/alerts.js`** (new): fetch by point or area, parse to a tidy shape, severity ordering and color metadata (Extreme / Severe / Moderate / Minor / Unknown), and an expiry-label helper.
- **`js/location.js`** (new shared module): the user's location persisted in `localStorage` and broadcast via a `tt-location-change` event, plus `geolocate()` and a permission-state check. This keeps the banner and the Track map in sync.
- **`js/alerts-banner.js`** (new): a site-wide banner rendered outside the section outlet so it persists across navigation.
  - Privacy-first: never auto-prompts. It auto-loads only if geolocation permission is already granted; otherwise it shows a "Use my location" button and a place-search fallback (Open-Meteo geocoding).
  - When alerts exist: a severity-colored strip with the top event and a count, expandable into severity-colored cards (event, area, headline, expiry). Dismiss and "change location" controls.
  - States for idle, loading, no-alerts, and error.
- **Track map overlay** (`js/sections/track.js`): draws inline alert polygons for the saved location, colored by severity, and refreshes when the location changes.
- **`css/styles.css`**: severity tokens and banner/card styles; sticky under the header; responsive.
- **`index.html` / `js/app.js`**: banner container and one-time init.

---

## Verification (local preview, live alerts)

Seeded the saved location to a point inside an active **Extreme Tornado Warning** polygon to exercise the full path.

| Check | Result |
| --- | --- |
| Banner loads alerts for a saved location | Pass |
| Severity strip colored by top severity | Pass (Extreme = dark red `#7f1d1d`) |
| Top event and "+N more" count | Pass ("Tornado Warning +2 more") |
| Expandable cards with severity pills | Pass (Extreme, Severe, Severe; area, headline, expiry) |
| Alert polygon drawn on the Track map | Pass |
| Dismiss / change-location / search controls | Pass |
| Console errors or warnings | None |

Geolocation auto-load depends on the browser permission and HTTPS (Netlify provides HTTPS); it degrades to the place-search fallback when denied.

---

## Acceptance criteria (from PRD)

| Criterion | Status |
| --- | --- |
| Active NWS alerts for the user's area appear | Met |
| Correctly colored by severity, with source data | Met |
| Surfaced in the Track section and a dedicated banner | Met (banner site-wide; polygons on the Track map) |
| Highlight affected zones on the map where feasible | Met for inline-polygon alerts (zone-only alerts list in the banner) |

---

## Notes and carryover
- Resolving zone-only alerts to geometry would require many extra `affectedZones` fetches; deferred as a possible enhancement.
- Next: Sprint 5 (Learn content plus accessibility and performance polish) closes out the plan.
