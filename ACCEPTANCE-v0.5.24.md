# LifeGrid v0.5.24 acceptance

## Qualification correction
The initial GitHub-hosted Firefox and WebKit runs each delivered the clipboard/download text, but finished **20 passed / 2 failed** because the test parser selected the first instructional `CURRENT LIFEGRID CONTEXT` occurrence and tried to parse text beginning with `Task add:`. The corrected parser selects the final marker, trims the following JSON, and asserts a non-empty context before parsing. Chromium CI now explicitly runs the v0.5.24 delivery suite after the retained v0.5.23 suite.

## Results for the correction head
- Local install: passed.
- Unit/integration: **114 passed, 0 failed, 0 skipped**.
- Typecheck: passed.
- Production build: passed (non-fatal existing sourcemap/chunk-size warnings).
- Local browser installation/execution: blocked by the environment proxy returning HTTP 403 during `playwright install --with-deps`.
- Corrected GitHub Actions Chromium smoke, v0.5.23, v0.5.24, Firefox, and WebKit results: pending the correction push.
- Vercel: the prior reviewed head was successful; the correction-head deployment is pending.

## Required manual release checks
- Chrome/Edge: copy replaces prior clipboard text; paste begins with the LifeGrid heading; download is a non-empty `.txt`; copied/downloaded content from the same state agrees; denied permissions show persistent failure feedback.
- Firefox/Safari: primary or fallback copy succeeds; download has the expected content; no object-URL race occurs.
- Mobile Safari/Chrome: supported copy works, failure exposes Preview, download/share remains usable, and a large package does not freeze the page.
- Content: all scope and exact counts; seven collections present; completed/undated Tasks present; no application functions or unrelated clipboard text.

## Deterministic fixture correction
The final qualification gap was a fixture defect: the parser correction exposed that the seeded Milestone lacked `projectId`, causing store normalization to reject the calendar and load fresh-install sample data. The canonical seed now uses the required `other` Category, complete entity fields, and a Milestone linked to `hotfix-project`. Every browser test first proves that `hotfix-calendar` loaded with exact `1/1/1/2/1/3/1` collection counts. Local unit qualification is now **115 passed, 0 failed, 0 skipped**. On parser head `78d02da16e1195eab1fe055c8a8f6fdba69d41ef`, Chromium smoke was 8/8, v0.5.23 was 10/10, and Vercel succeeded; correction-head browser and deployment results remain pending and are release gates.
