# LifeGrid v0.5.30 — Export fidelity and Letter-frame utilization

This focused release corrects publication rendering without changing planner records, storage schema, or AI interchange.

- Month-column publications now establish their own foreground and background from scoped Light/Dark publication tokens. Titles, the Categories heading, and legend labels explicitly consume the publication foreground.
- Firefox Canvas2D draws structural month/day components through an exact-text path. It may reduce font size to a readable 9px floor, but never prose-fits or ellipsizes dates.
- Rolling-day tables use bounded, density-aware natural row heights inside the unchanged 1400 × 1082 Letter landscape page. Residual page space is below the table, not between headings, dates, and Events.
- Legend entries are non-shrinking; labels have a bounded label box, wrap at spaces, and break internally only for overlong unbroken tokens.
- Month-column year/quarter/current-grid output remains content-bound and is intentionally not forced to Letter ratio.

Qualification includes computed child-color contrast, real PNG pixel-region checks, exact Canvas `fillText` tracing in Firefox, frame ratios, top alignment, and legend geometry across Chromium, Firefox, and WebKit.
