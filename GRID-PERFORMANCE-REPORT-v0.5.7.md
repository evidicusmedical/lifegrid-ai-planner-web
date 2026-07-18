# Grid performance report — v0.5.7

## Baseline and evidence
The reported real-user baseline is approximately **11 s**. It was not reproduced: this environment has no browser automation/browser trace run and private user data was not copied. Starting main was `564159e`; PR #22 merge is present and includes `dbe5c34`.

## Instrumentation
Development-only marks, in order: navigation-click, route-state-updated, view-mounted, model-start, index-start, index-complete, model-complete, dom-start, first-commit, first-visible-cell, dom-complete, interaction-ready. `window.lifegridGridTiming()` reports deltas from the click and stores nothing. Marks tolerate missing Performance APIs.

## Findings and ranked hypotheses
1. Annual table construction is the largest identified synchronous visual risk: 12 month headers plus 365 cells and nested event chips mount together.
2. `html-to-image` was eagerly evaluated with Grid; it is now dynamically imported on export.
3. Data indexing is already one index per event/timezone change. Node figures are not browser proof.
4. Route navigation is local App state; it does not change the store, so the store persistence effect does not run.

## Implemented mitigation
The Grid shell commits immediately, then annual DOM creation starts in the next animation frame. This provides immediate tab/shell feedback, cancellation on unmount/year/calendar changes, `aria-busy`, and a live ready announcement. All months still complete deterministically in that frame; export cannot run until the table ref exists.

## Reproduction protocol
Build and preview, open DevTools Performance, enable/disable service worker in Application, start from Tasks and Settings, click Grid, then capture `window.lifegridGridTiming()`, DOM node count, longest task, scripting/layout/paint, React commits, localStorage calls, and chunk requests for cold/warm desktop, 390×844, and 768×1024. Do not include user records in traces.
