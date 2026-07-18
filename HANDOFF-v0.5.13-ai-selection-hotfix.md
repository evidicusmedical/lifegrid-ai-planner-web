# v0.5.13 handoff

PR #28 is merged: local starting main-equivalent merge `b8d9fd6` contains preceding head `1bfb7e5c604e82080342f3bebab94be9f60e2332`. Baseline was APP_VERSION/package v0.5.12/0.5.12, AI interchange 4, backup schema 6.

Before the fix, checkbox and filtering keys used display titles (for example `Tasks:add:id:0`), while readiness/preflight used lowercase keys (`tasks:add:id:0`); every visually checked row therefore produced an empty readiness selection. v0.5.13 establishes `entityType:operation:recordId`, removes row indexes from persistent identity, and uses it in dependency analysis, preflight, rows, toggles, bulk controls, readiness, and filtering.

A patch session is represented by normalized parsed JSON. The first effect for a session computes selectable non-blocking keys and populates the single `Set`; a ref makes StrictMode-style effect replay idempotent. Derived warnings and ordinary rerenders do not reset it. DEV exposes `window.lifegridAiReviewState()` with counts/keys only (no record content).

Automated tests cover forty Task/Event records, warnings, recreated Set identity, collisions, zero/one-row transitions, sparse updates, atomic apply, Grid, interchange, and backup. Manual browser verification was not performed in this environment. Branch, commit, PR URL, and deployment status must be completed after release automation: branch `codex/implement-v0.5.13-ai-selection-state-hotfix`; deployment not performed.
