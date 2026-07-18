# v0.5.9 — Real-Data Grid Scaling

This release addresses the user-observed ~11-second, data-shaped Grid transition without collecting or committing private backup content. It adds deterministic fictional structural fixtures: real-shape (450 Events, 200 Tasks, 40 schedule records, 16 categories, 10 conceptual tags, three years) and stress-real-shape (1,500 Events, 500 Tasks, five years). They include long fictional notes, Day Types, reminder groups, linked tasks, timed/unknown/approximate/all-day and multi-day records.

The annual Grid now selects source records intersecting the displayed year before temporal display conversion, builds compact summaries, and omits notes, AI/source notes, task links, recurrence and editor/review data. Day Detail and EventSheet retain authoritative full-record access. Month models preserve unchanged month references and the UI admits the current month first, then neighbours and remaining months in cancellable animation-frame batches. Export/backup/ICS continue to use full records.

Node model benchmarks are not browser timings. Browser tooling and private-backup/manual production verification remain unperformed. Future v0.6.0 should consider explicit yearly recurrence only with backup/ICS/import compatibility; this release does not infer or collapse existing records.
