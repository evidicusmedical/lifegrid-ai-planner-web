# LifeGrid v0.5.27 Acceptance

- [x] Default and year-reset views are Jan–Dec; rolling controls always produce twelve real calendar month descriptors.
- [x] Cross-year and leap-year cells derive dates and day counts from each descriptor.
- [x] Current Grid, Calendar Year, Q1–Q4, Next 7/14/30, and Custom ranges have explicit semantics.
- [x] Custom validation accepts up to twelve distinct calendar months and rejects thirteen.
- [x] Week (1–14), multiweek (15–45), and month-column (>45) planning is deterministic.
- [x] Highest safe 2/1.5/1 raster ratio is automatic; infeasibility is explicit and never drops records silently.
- [x] Visible/Expanded, Fast/Sharp, and Compact/Detailed are absent from the user-facing export panel.
- [x] Publication event titles wrap; structural dates are not passed through title overflow logic.
- [x] Category, Project, `showInGrid`, and `showInExport` independence is preserved.
- [ ] Hosted GitHub Actions, Vercel, and physical-device checks require external infrastructure.
