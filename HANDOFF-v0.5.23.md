# LifeGrid v0.5.23 merge-blocking correction handoff

## Identity
- Repository: `evidicusmedical/lifegrid-ai-planner-web`.
- Branch: `codex/implement-lifegrid-v0.5.23`.
- Starting main: `8befb5ce10d2c352503f77bbfe3e9a786d72df81`.
- Reviewed heads: `3376ede604ca3a12103de521b086318c2a9d1560`, `cea1c81bbbc88dc9066300ce7f9141618fac3d8a`, `2f39d1a59bff7076edbdb8ef87141962235022ad`, `7a92329467a6c1efc24a5887a2aba069341de072`, and `b5c78540ba2eb3b21ed7bfcc82cc881f770abf23`.
- Locally available parent: `1e9542c112c9b049dbd7b1983872d942c0d4c043`; the supplied reviewed head could not be fetched because the environment proxy rejects GitHub with HTTP 403.
- New correction SHA/head: recorded in the PR description and final delivery response after commit.
- Existing PR: #47, https://github.com/evidicusmedical/lifegrid-ai-planner-web/pull/47. Do not merge until the new remote checks are green.

## Diagnosis and correction
- The Custom preset previously changed only `datePreset` and left both custom values empty. Cross-engine qualification could click the preset but never reach a valid visible targeted-range state. `applyExportDatePreset` now performs the sole state transition, initializes empty values from the current detail/today through a seven-day range, retains existing values, and supplies `aria-pressed`.
- The outside-pointer listener already follows the correct containment contract. Browser tests now scope preset and inputs to the visible desktop Export panel and assert the panel stays open through selection and edits.
- The Multi-day add branch was the production time defect: explicit All-day/null overrides followed the normalized base. It now spreads the normalized base and overrides only authoritative `date`/`endDate`, preserving valid Timed clocks and retaining null All-day clocks.
- The Multi-day End Date owns the inclusive calendar span. TemporalFields owns time type and clock values; the add branch property order prevents either concern from overwriting the other.

## Exact correction files
- `ACCEPTANCE-v0.5.23.md`
- `EVENT-PROJECT-TIME-MULTIDAY-CONTRACT-v0.5.23.md`
- `GRID-HOVER-ORDERING-CONTRACT-v0.5.23.md`
- `HANDOFF-v0.5.23.md`
- `artifacts/lifegrid/e2e/v0523.spec.ts`
- `artifacts/lifegrid/src/components/EventSheet.tsx`
- `artifacts/lifegrid/src/lib/gridModel.ts`
- `artifacts/lifegrid/src/pages/GridView.tsx`
- `artifacts/lifegrid/tests/contracts-data-helpers-v0523.test.mjs`

## Qualification
- Frozen install: passed locally.
- Unit/integration: 107 passed, 0 failed, 0 skipped.
- Typecheck: passed.
- Production build: passed with existing non-blocking sourcemap-location and >500 kB chunk warnings.
- Prior GitHub run supplied by review: Chromium smoke 8/8; Chromium v0.5.23 7/8; Firefox 15/16; WebKit 15/16; Vercel success. All failures were the same Custom targeted-export test addressed here.
- New local browser installation remains blocked during apt dependency access by proxy HTTP 403, so no new local browser success is claimed. Updated discovery: Chromium v0.5.23 has 10 tests; full Firefox and WebKit each have 18. Diagnostic launch attempts stopped after one missing-executable failure, leaving 9 Chromium and 17 Firefox/WebKit tests not run.
- New GitHub Actions conclusion: pending successful push; do not reuse the prior run as proof for the new head.
- New Vercel conclusion: pending successful push.
- Diff check: passed before commit.

## Remaining acceptance
Require green new-head Chromium smoke/v0.5.23, Firefox, WebKit, and Vercel before merge. Physical desktop/iPhone checks remain real-pointer preview transfer, generated-image inspection, native download/share, coarse-pointer hover absence, safe-area/focus behavior, rotation, and dense-calendar performance.
