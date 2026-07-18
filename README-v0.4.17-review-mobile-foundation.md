# LifeGrid v0.4.17 — Simplified Time Data Review and Mobile Foundation

## Release objective
Rapid Review has been removed in favour of the single, analyzer-driven **Time Data Review**. It now refreshes active-calendar findings without changing data, compares stable issue keys, reports additions/resolutions, and opens the normal Event or Person Schedule editor. A successful review-originated save rechecks the analyzer; cancellation leaves findings untouched. Calendar changes discard stale findings and load the new active calendar.

## Mobile foundation
Shared CSS prevents body horizontal overflow while preserving Grid-owned scrolling, adds safe-area header padding, dynamic viewport sheet bounds, internal code scrolling, fluid controls, and phone ranges (320–374, 375–430, 431–767), with existing desktop/tablet behaviour. The compact header retains version, truncated/title-backed calendar name, timezone and UTC clock. Review buttons are touch-sized and results use a live region.

## Compatibility and performance
`src/lib/version.ts` is the canonical version source: `v0.4.17`. AI interchange remains v4 and backup schema remains v6. Review analysis runs for initial view, manual refresh, calendar switch, and review-originated save—not unrelated renders. No browser runner is installed; source-contract Node tests were run, not browser verification.

## Limitations and next scope
This is not a full mobile workflow redesign. v0.4.18 should audit individual editing and export workflows in browser/device testing. Branch: `codex/implement-v0.4.17-review-mobile-foundation`. Commit and PR URL are recorded after release creation. Deployment has not been production-verified.
