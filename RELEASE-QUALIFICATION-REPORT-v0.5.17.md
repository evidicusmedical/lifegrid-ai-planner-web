# Release qualification report — v0.5.17

## Provenance and environment
- Starting main: `e7e83a4`; PR #38 is merged, with preceding implementation head `3b01429866068ba86cfeed247219bb42e7b8961a`.
- Target: app `v0.5.17`, package `0.5.17`, interchange 4, backup schema 7.
- Environment: local Linux CI-style workspace. Production checks are read-only only. No user or private fixtures were used.

## Automated qualification
- Unit suite, typecheck, build, Node benchmark commands, and `git diff --check` are recorded from the final run below.
- Playwright `1.55.0` configuration covers Chromium/Firefox/WebKit desktop and Chromium/WebKit iPhone emulation; artifacts are retained only on failure. Browser download was unavailable in this environment (npm registry returned 403), so browser results are pending execution in CI.
- Fixture/contract scope: empty/small/dense, schema-6, malformed, and AI-patch lifecycle requirements are documented in the E2E contract; no personal data is permitted.
- Duplicate repair: exact indexes are constructed once per `preflightPatch`; existing and same-patch exact duplicates block application; name/title-only matches warn. Regression test covers exact and advisory event cases.

## Results and limitations
- Backup schema-7 round trip, schema-6 local date/time migration, ICS local/floating rules, Grid model timings, AI prompt/review/atomic apply, worker retirement, and image-export structural contracts retain their established unit-contract coverage.
- Browser Grid timings and event-save timing: pending browser execution; ceilings are Grid shell <500 ms, usable Grid <1500 ms, editor <500 ms, save <1000 ms.
- Manual desktop, real iPhone Safari, and Home Screen testing were not performed. WebKit automation does not claim real-device Safari equivalence.
- Production v0.5.17 cannot be confirmed before deployment.

## Recommendation
**Automated qualification passed where runnable; real-device acceptance pending.** Do not label this release fully qualified until the manual matrix and CI browser matrix complete. No known data-loss defect is deferred; blocked registry access is the qualification limitation.

## Final local command record
- Unit contracts: **62 passed, 0 failed, 0 skipped**.
- Node benchmark large fixture: grid index 0.676 ms median; task indexes 0.609 ms; backup serialization 72.131 ms. Grid real-shape model median was 0.56 ms in the final real-shape run.
- Typecheck, workspace typecheck, LifeGrid build, workspace build, and diff check passed.
- E2E command attempts were blocked before execution because `@playwright/test` could not be downloaded: npm registry responded `403 Forbidden`; no browsers could be installed. Console/page errors and browser test totals are therefore not available, rather than reported as passing.
