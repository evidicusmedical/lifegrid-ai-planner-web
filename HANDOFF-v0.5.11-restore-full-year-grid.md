# Handoff — v0.5.11 Restore Full-Year Grid

## Starting state

- PR #26 is present in history as merge commit `81839f1`; its preceding head is `f2c0a7b`.
- Starting `main` commit recorded in this workspace: `81839f1`.
- Starting visible/package release: v0.5.10 / 0.5.10. v0.5.11 retains AI interchange 4 and backup schema 6.

## Root cause and correction

v0.5.10 added `GridMonth`, a full-width monthly-calendar section, and rendered only `mountedMonthKeys.map(...)`. `getGridMountOrder` prioritized the current/selected month, so document order directly followed priority (for example July before June). It also admitted sections over time, growing page height.

This release restores the pre-v0.5.10 compact annual `<table>` structure from commit `e21d8f2`: chronological headers and day rows make every month structurally present. Removed files are `src/lib/gridMounting.ts` and `tests/grid-incremental-mounting.test.mjs`. Removed behavior includes scheduler admission, browser yielding, transitions, priority-driven month JSX, full-width sections, and export admission. Safe v0.5.9 grid summaries, displayed-year filtering, memoized data derivation, full Event lookup by ID, and privacy-safe development diagnostics remain.

## Contract and verification

Annual DOM/visual order is January through December; June precedes July regardless of hypothetical priority. Current and selected dates are highlighted in their canonical cells. Export uses the same compact chronological annual table. New source/model contract tests guard the table, slots, absence of mount ordering, and June/July regression. Browser scripts are not configured in this workspace; desktop/mobile acceptance remains manual after deployment.

## Delivery

- Branch: `codex/implement-v0.5.11-restore-full-year-grid`.
- Commit and PR URL: fill after commit/PR creation.
- Deployment: pending PR merge and hosting deployment.
