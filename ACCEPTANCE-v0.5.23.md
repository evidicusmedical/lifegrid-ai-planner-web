# v0.5.23 correction acceptance

- [x] Production AI package generator delegates complete/range selection to one scope helper and emits metadata plus manifest counts.
- [x] AI parser sanitizes hard relationships before preflight; Event Projects are transactionally validated.
- [x] Day Detail and image export share inclusive range expansion and deterministic ordering.
- [x] One Grid-owned hover timer pair supports pointer/focus transfer.
- [x] Person schedule editing normalizes legacy time states without load-time migration.
- [x] Direct Event Projects participate in image filtering and existing clear/reassign helpers.
- [x] Palette contains 32 named unique colors and passes the CIE76 distance contract.
- [x] Typecheck, 105 unit/integration tests, build, and diff check pass.
- [ ] Playwright browsers and physical desktop/mobile/iPhone verification remain environment-dependent.
- [x] Targeted image export consumes the authoritative expanded export date buckets.
- [x] AI Event additions/explicit time updates canonicalize to All day or Timed with one warning.
- [x] Event-only Project deletion displays assignment handling and accurate counts.
- [x] All three Settings managers share one stable-ID Up/Down control.
- [x] Colored text surfaces dynamically select WCAG-readable black or white foreground.
- [x] Desktop and compact Export panels share document-level outside/Escape dismissal.

## Final CI qualification correction
- [x] `startup.spec.ts` parses `APIResponse.json()` and strictly asserts the complete v0.5.23 version object with supported Playwright/JavaScript assertions.
- [x] Manifest and all three retirement-worker response and no-fetch-handler assertions remain enabled.
- [x] Search found no other `toHaveJSON` or unregistered/Jest-only APIResponse matcher usage in LifeGrid E2E tests.
- [x] Unit/integration qualification remains 105 passed, 0 failed, 0 skipped; typecheck and production build pass.
- [x] The cross-browser GitHub Actions job is enabled for PRs instead of being skipped by a main-push-only condition.
- [ ] Local Chromium/WebKit execution was blocked by the container proxy: `playwright install --with-deps` could not update apt indexes (HTTP 403), leaving the configured executables absent. GitHub-hosted qualification must provide the authoritative browser result.
- [ ] GitHub Actions and Vercel conclusions require a successful branch push and remote access.
