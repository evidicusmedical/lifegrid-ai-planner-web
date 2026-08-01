# LifeGrid v0.5.24 acceptance

## Automated qualification
- `pnpm install --frozen-lockfile`: passed.
- Unit/integration: **114/114 passed** (baseline exceeded by seven).
- Typecheck and production build: passed.
- Playwright browsers: blocked locally because the Microsoft/CDN downloads returned HTTP 403; browser suites remain required in CI.

## Manual release checks
- Chrome/Edge: copy replaces prior clipboard text; paste begins with the LifeGrid heading; download is a non-empty `.txt`; copied/downloaded content from the same state agrees; denied permissions show persistent failure feedback.
- Firefox/Safari: primary or fallback copy succeeds; download has the expected content; no object-URL race occurs.
- Mobile Safari/Chrome: supported copy works, failure exposes Preview, download/share remains usable, and a large package does not freeze the page.
- Content: all scope and exact counts; seven collections present; completed/undated Tasks present; no application functions or unrelated clipboard text.
