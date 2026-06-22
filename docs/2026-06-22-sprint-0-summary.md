# Sprint 0 Summary — Foundation

**Date:** 2026-06-22
**Sprint goal:** A clean static skeleton, deployed and navigable, with the Resource Hub fully working.
**Outcome:** Complete (deploy step pending Netlify connect).

---

## What was built

### New static site (pure static, no backend)
- **App shell** ([index.html](../index.html)): sticky header, self-building nav, section outlet, footer with the NHC disclaimer, inline SVG favicon, Open Graph meta.
- **Design system** ([css/styles.css](../css/styles.css)): CSS variables carried from v1 for visual continuity (slate base, blue accents, Saffir-Simpson category colors). Responsive, with a mobile hamburger nav and reduced-motion support.
- **Router** ([js/app.js](../js/app.js)): hash-based routing with shareable deep links (for example `#resources`), active-tab state, and dynamic page titles. The nav builds itself from the section registry, so adding a section is a one-line change.
- **Section modules** ([js/sections/](../js/sections/)): one module per section. `track`, `radar`, `satellite`, and `learn` are sprint-tagged placeholders. `resources` is fully built.
- **Resource Hub** ([js/sections/resources.js](../js/sections/resources.js) + [js/data/resources.js](../js/data/resources.js)): all 38 links from the old `sources.html`, ported into 10 categories, with a live text filter and empty state.
- **Deploy config** ([netlify.toml](../netlify.toml)): static publish, security headers, and a redirect that keeps `/legacy` off the public site.

### Housekeeping
- Archived all v1 files (PHP proxies, old app, test pages) into [legacy/](../legacy/) using `git mv`, so history is preserved and the move is reversible.
- Rewrote [README.md](../README.md) with the new architecture and sprint checklist.
- Added [CLAUDE.md](../CLAUDE.md) so future sessions have project context.

---

## Architecture decision recap

The defining constraint is **pure static, no backend**. The old PHP proxy existed only to defeat browser CORS and hide API keys. Going backend-free means every data source must be CORS-enabled and key-free, or consumed as an embed or hotlinked image. This shapes every future sprint and is why the PRD pre-selected CORS-safe sources (NHC ArcGIS REST, `api.weather.gov`, RainViewer, Iowa Mesonet, RAMMB SLIDER, NESDIS).

The section-module contract (`{ id, label, icon, render(), mount?(el) }`) is the extensibility backbone. Each future sprint fills in one module.

---

## Verification (local preview, http://localhost:8000)

| Check | Result |
| --- | --- |
| Routing across all 5 tabs, active state, page titles | Pass |
| Resource Hub renders 10 cards, 38 links | Pass |
| Live search: match, empty state, reset | Pass |
| Dark theme and card layout | Pass |
| Console errors or warnings | None |

---

## Acceptance criteria

| Criterion (from PRD) | Status |
| --- | --- |
| Tabs switch via hash routing | Met |
| Resources section fully usable | Met, with bonus live search |
| Responsive shell and dark theme | Met |
| Site loads under 2 seconds | Met locally; confirm on Netlify |
| Deployed and public | Pending Netlify connect (see netlify-setup doc) |

---

## Carryover into Sprint 1
1. Connect the repo to Netlify to satisfy the deploy criterion (see [netlify-setup.md](netlify-setup.md)).
2. Run the CORS spike on NHC ArcGIS REST and `api.weather.gov` before building the live map.
