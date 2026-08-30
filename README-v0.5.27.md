# LifeGrid v0.5.27

LifeGrid v0.5.27 introduces a canonical rolling twelve-month Grid. The initial view remains January–December of the current year; compact Start Month controls shift the first displayed month across year boundaries, while year arrows and the actionable year label reset to calendar-year windows.

Image publication now asks users only for range, Category/Tag and Project filters, and optional title/subtitle. Current Grid exports the exact rolling window; Calendar Year and Q1–Q4 use the anchor year; Next 7/14/30 remain today-based. Custom ranges may touch at most twelve distinct calendar months, including a 366-day leap year.

A deterministic planner uses week layout through 14 days, multiweek through 45 days, and month columns above 45 days. It sizes wrapped event blocks, preserves structural date labels, includes all filtered records when feasible, and selects the highest safe ratio from 2, 1.5, and 1. The Firefox targeted Canvas2D path shares deterministic multiline title wrapping; long-range renderer architecture, Download, Share, filtering, and `showInExport` independence remain intact.

For long publication, the exported month descriptors are authoritative even when the interactive window begins in another month. Month-column images therefore retain January 31, March 31, and leap-day records and apply planner-controlled multiline Event blocks without enlarging the normal interactive Grid.
