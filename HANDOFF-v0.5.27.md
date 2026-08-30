# LifeGrid v0.5.27 Handoff

## Product and architecture
`gridWindow.ts` is the canonical, DST-independent month-window layer. `GridView` owns a `{year, monthIndex}` anchor and derives exactly twelve descriptors. Semantic `YYYY-MM` keys drive headers, cells, model buckets, and staged admission. Year controls reset to January; Start Month controls shift with calendar rollover and return horizontal scroll to the beginning.

`gridPublicationPlan.ts` is the sole publication decision maker. It selects week for 1–14 days, multiweek for 15–45, and 1–12 month columns above 45 days. Event density determines complete row height. Ratios 2, 1.5, and 1 are tried against mobile/desktop edge and area guardrails; an unsafe complete image produces an actionable error.

The convergence correction makes the descriptors in the staged export window authoritative: Q1 and Calendar Year publications from non-January interactive windows use each exported month's own `daysInMonth`, including February 29, 2028. Month-column publication now consumes the planner's line count, font metrics, Event block height, and row height while the ordinary Grid returns to compact one-line pills as soon as the image preview closes.

## Export and renderer behavior
Current Grid is the exact rolling range. Calendar Year and quarters resolve from the anchor year. Next presets remain today-based. Custom validation counts inclusive year/month components, so full 2028 is valid while any range touching thirteen months is blocked. HTML publication uses multiline wrapping; Firefox targeted Canvas2D uses the shared deterministic word/character wrapper and final-line-only ellipsis. Existing browser-specific renderer selection, Download, native Share, filename sanitation, Category/Project filtering, and `showInExport` authority remain.

## Qualification state
Local unit suite: 157 tests, 0 failures, 0 skips. Typecheck and build pass. The expanded v0.5.27 Playwright suite contains nine zero-retry scenarios and performs real short and long PNG generation in every configured browser, including export-month boundary, leap-day, wrapping, filtering, partial-range, and PNG-signature assertions. Final hosted run and Vercel state are recorded in the PR after the correction is pushed.

## Known limitations and manual acceptance
Hosted CI and Vercel cannot be initiated without GitHub connectivity. Physical-device checks remain recommended:

- Desktop: verify Sep–Aug, year reset, long Current Grid legibility, obvious date numbers, and wrapped titles.
- iPhone Safari: verify Start Month touch controls, compact export panel, short and Current Grid generation, native Share, long-press save, safe areas, and orientation.
