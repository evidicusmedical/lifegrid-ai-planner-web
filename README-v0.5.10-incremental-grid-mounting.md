# v0.5.10 — Incremental Grid mounting

v0.5.9’s compact, displayed-year Grid model benchmarked quickly in Node, yet a private production backup still produced an approximately ten-second blank wait followed by an all-at-once annual Grid. The prior interactive table created every month/day cell on the first commit and merely deferred event pills.

v0.5.10 admits one real `GridMonth` at a time: selected/current month (or January), previous adjacent, next adjacent, then chronological remainder. A two-RAF browser yield with a 120ms timeout fallback separates shell, first month, and later batches. Generation/AbortController cancellation prevents stale work after route/calendar/year/model changes.

Development-only local diagnostics expose `window.lifegridGridTiming()` and `window.lifegridGridDomStats()`; neither sends telemetry or includes record content. Image export explicitly expands to all months and waits before capture. The visible App Header reports v0.5.10. Hard refresh and inspect timing `serviceWorkerControlled` before production testing. Browser measurements and private-backup validation remain unverified in this environment.
