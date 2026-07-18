# v0.5.5 acceptance checklist

- [x] Version v0.5.5; AI interchange 4; backup schema 6.
- [x] Deterministic fictional small, medium, and large benchmark fixtures and Node medians.
- [x] Grid date indexing preserves event records; Task/Project selector tests pass.
- [x] Collapsed Flagged Items does not analyze; opening or Refresh performs analysis.
- [x] Storage skips unchanged serialized state while changed state remains synchronous.
- [ ] Browser first/repeat Grid, Tasks, Settings timings (desktop, 390×844, 768×1024): not performed.
- [ ] Installed-PWA offline lazy-chunk and export first-use verification: not performed.

Stop on data loss, review false negatives, storage errors without alert, temporal/ICS/backup regression, or console errors. Recovery: restore a schema-6 backup, reload, and record browser console output. Record actual route target values only from browser measurements; Node selector medians are documented in PERFORMANCE-BASELINE.
