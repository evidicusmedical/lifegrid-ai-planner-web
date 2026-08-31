# v0.5.29 acceptance

- Deterministic planner: day-agenda, rolling-day-grid, month-matrix, month-columns.
- Today is local-date based; CY Current Month is the actual local month.
- Rolling ranges begin in cell one; 45 days remains rolling and 60 days becomes month columns.
- Export sessions reset without persistence; Light is default and Dark is independent of app theme.
- Wrapped represented-category legend and structural month/day spans are shared by captured DOM semantics.
- US Letter framing is automatic: ordinary agendas portrait, dense agendas and grids landscape.

Qualification results are recorded in `HANDOFF-v0.5.29.md` only after execution.

## Final convergence coverage

- Canvas2D has explicit `day-agenda` drawing and multiline legend contracts.
- September 2026 month-matrix headings are Sun–Sat, with leading cells before Tuesday September 1.
- Export Light/Dark tokens are scoped to both targeted and month-column publication roots.
- The focused zero-retry browser suite exercises clean defaults, rolling 7/14/30 ranges, dense and future agendas, Sunday-first full-month output, independent themes, valid PNG signatures, and Firefox renderer identity.
- Historical CY-quarter assertions and WebKit cross-year lazy-admission steps were updated without sleeps or retries.

## Final routing and fitting convergence

The planner layout is now the single capture-family decision. DST-spanning 45/46-day ranges are tested as date-only boundaries. Rolling tables always expose seven chronological headings, including two- and six-day Custom ranges. Portrait/landscape frame width is selected before typography and feasibility. Agenda DOM and Canvas2D paths consume the same planned font, line height, line count, and card height. The off-screen agenda heading retains `aria-hidden` ancestry and exposes stable date diagnostics.
