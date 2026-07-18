# Grid mounting contract v0.5.10

Initial tree: shell, controls/status, and zero or one `GridMonth`; unadmitted months are not JSX, hidden containers, placeholders, or DOM. A mounted month is one element bearing `data-lifegrid-grid-month`.

Order is explicit selected month, current month in current year (otherwise January), previous adjacent, next adjacent, then chronological unique remainder. The first commit has one month; batches are one until three months and at most two afterward. `yieldToBrowser` uses two RAFs and a 120ms timeout fallback.

Each schedule owns an AbortController and monotonic generation. Cleanup on unmount/year/calendar/model replay aborts it; stale generations cannot append or complete. First-useful-ready means first month committed; full completion means 12 unique keys committed. Day Detail remains shared outside months. Image export is the explicit full-mount path and waits before capture; cleanup restores usable UI. Diagnostics are DEV/local only and contain phase/counts, never titles, notes, names, or dates. DOM attributes report counts only.
