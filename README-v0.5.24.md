# LifeGrid v0.5.24 hotfix

v0.5.23 passed the complete React context object into complete AI export. The all-data selector then called `structuredClone` on functions, raising `DataCloneError` before clipboard or download delivery. Restricted ranges could appear healthy because they cloned individual collection records.

v0.5.24 passes only active-calendar `AppData`, defensively selects/clones the seven canonical collections, builds fresh text for every delivery action, falls back to an off-screen textarea for copy, and downloads UTF-8 text with an attached anchor and delayed object-URL cleanup. Generated text is kept only in component Preview state and is never persisted.

## Qualification correction
The initial Firefox/WebKit delivery tests failed after real text delivery because their parser used the first instructional `CURRENT LIFEGRID CONTEXT` occurrence. Qualification now parses JSON after the final marker, keeps the real clipboard-boundary and browser-download assertions, covers positive and total-failure fallback behavior, adds native Chromium clipboard confidence, and explicitly runs the v0.5.24 suite in Chromium CI.

A second test-only issue appeared after the parser repair: an orphan seeded Milestone made LifeGrid correctly reject the deterministic calendar and fall back to sample data. The fixture now uses normalization-stable canonical entities, including Category `other` and a Milestone referencing the active `hotfix-project`; a precondition detects any sample-data fallback before delivery assertions.
