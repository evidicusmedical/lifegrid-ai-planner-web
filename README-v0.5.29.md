# LifeGrid v0.5.29 — Operational exports

Image export now offers, in order: Current Grid, Calendar Year, CY Q1, CY Q2, CY Q3, CY Q4, CY Current Month, Next 30, Next 14, Next 7, Today, and Custom. Today and one-day Custom ranges use a day agenda; chronological 2–45 day ranges use a seven-column rolling grid; exact calendar months use a Sunday-first month matrix; established longer publications remain month columns.

Each newly opened workflow resets to Current Grid, all Categories, all projects, Light, generated timestamp enabled, and blank custom text. Light/Dark affects only publication output. Operational layouts target 1082×1400 portrait or 1400×1082 landscape CSS frames and safe 2× capture when feasible. Dates are structural, legends wrap, and title fitting retains uniform cards with bounded final-line ellipsis only for exceptional prose.

## Convergence corrections

Firefox's qualified Canvas2D renderer now consumes the same semantic layout names as the planner and draws agenda dates, counts, ordered Event cards, times, wrapped titles, and multiline Category legend labels from staged DOM geometry and computed styles. Month matrices use explicit Sunday-first headings while rolling grids retain range-relative headings. Scoped Light/Dark publication variables theme the complete staged publication independently from the application theme.
