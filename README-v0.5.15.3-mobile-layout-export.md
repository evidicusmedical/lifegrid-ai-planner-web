# LifeGrid v0.5.15.3 — Mobile layout and Grid export accessibility

This release makes the existing annual Grid image-export workflow usable at phone widths without changing the canonical January–December table. The Grid header now has an always-visible **Export** control that opens a bounded, vertically scrollable options panel. Options retain range, density, title, subtitle, timestamp, category, project, quality/mode and generation controls.

Generated images open in an in-app preview. Browsers that can share a generated PNG File expose **Share image**; all browsers retain **Download image**, and iPhone users can press and hold the preview to save it.

The export data models are lazy: ordinary Grid rendering does not build filtered export records, targeted weeks, or export legend data. They are derived only after export UI is opened or generation begins.
