# LifeGrid v0.5.27 Handoff

## Product and architecture
`gridWindow.ts` is the canonical, DST-independent month-window layer. `GridView` owns a `{year, monthIndex}` anchor and derives exactly twelve descriptors. Semantic `YYYY-MM` keys drive headers, cells, model buckets, and staged admission. Year controls reset to January; Start Month controls shift with calendar rollover and return horizontal scroll to the beginning.

`gridPublicationPlan.ts` is the sole publication decision maker. It selects week for 1–14 days, multiweek for 15–45, and 1–12 month columns above 45 days. Event density determines complete row height. Ratios 2, 1.5, and 1 are tried against mobile/desktop edge and area guardrails; an unsafe complete image produces an actionable error.

## Export and renderer behavior
Current Grid is the exact rolling range. Calendar Year and quarters resolve from the anchor year. Next presets remain today-based. Custom validation counts inclusive year/month components, so full 2028 is valid while any range touching thirteen months is blocked. HTML publication uses multiline wrapping; Firefox targeted Canvas2D uses the shared deterministic word/character wrapper and final-line-only ellipsis. Existing browser-specific renderer selection, Download, native Share, filename sanitation, Category/Project filtering, and `showInExport` authority remain.

## Qualification state
Local unit suite: 153 tests, 0 failures, 0 skips. Typecheck and build are documented in the final delivery after execution. GitHub Actions run ID, Vercel state, and final hosted browser results are unavailable until the branch can be pushed (network access is blocked in this environment).

## Known limitations and manual acceptance
Hosted CI and Vercel cannot be initiated without GitHub connectivity. Physical-device checks remain recommended:

- Desktop: verify Sep–Aug, year reset, long Current Grid legibility, obvious date numbers, and wrapped titles.
- iPhone Safari: verify Start Month touch controls, compact export panel, short and Current Grid generation, native Share, long-press save, safe areas, and orientation.
