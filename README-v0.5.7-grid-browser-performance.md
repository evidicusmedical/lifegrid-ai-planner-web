# LifeGrid v0.5.7 — Grid browser performance

A user reported an approximately **11-second** delay before Grid became usable. This release instruments the browser interaction path and makes the route shell paint before the annual Grid DOM is created. It does not claim the private production dataset symptom is reproduced or resolved: no private records were accessed.

## Changes
- Development-only marks cover click, hash state, mount, model/index, DOM, first visible cell, and ready. In development, run `window.lifegridGridTiming()` to view the latest transition without record content.
- Grid renders its heading and controls first, then yields one animation frame before mounting the annual table. `aria-busy` and a restrained live status communicate the deferred work.
- `html-to-image` now loads only when image export is requested; it is outside the synchronous Grid path.
- Route state remains in `App`; navigation does not call the data mutation, backup, review, or persistence paths.

## Browser measurement
Browser automation was not installed in this checkout, so browser timings, paint/layout, service-worker behavior, and the reported 11 seconds remain unverified. See the acceptance and performance report for a reproducible DevTools protocol. Node benchmark results are model-only and must not be interpreted as browser interaction timings.

## v0.5.8
Run Chromium/Firefox/WebKit traces with deterministic fixtures and a user-performed production trace; then consider month batching only if the trace shows DOM/layout dominance.
