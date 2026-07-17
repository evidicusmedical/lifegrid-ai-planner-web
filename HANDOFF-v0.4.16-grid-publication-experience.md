# Handoff — v0.4.16 Grid and Publication Experience

## Audit and baseline
Repository confirmed at `/workspace/lifegrid-ai-planner-web`. The checkout began at `37c9968`, merge PR #12; its preceding merged head `16da058de3611ae93ceca2ae57617de9d711b4f2` is present. This clone has no local `main` ref, so the required branch was created from the merged checkout. Baseline APP_VERSION/package were v0.4.15/0.4.15; AI interchange was 4 and backup schema 6.

`AppHeader` is mounted once in `App.tsx`; GridView still had redundant version/reference-clock content (removed from this release). GridView is a 31×12 table with event pills sorted by priority/time/category/title; its old note exposure was `truncatePreviewNote(..., 180)`. DayDetail used a bottom sheet but clamped notes to two lines. Export is DOM capture using `html-to-image/toPng`, with filename `lifegrid-<calendar>-<range>.png`; targeted ranges used a separate DOM table. Existing export was filter/range based but had no image legend or required metadata.

## Implementation
`gridPublication.ts` supplies pure, immutable legend construction, metadata/text sanitisation, Compact/Detailed configuration, deterministic dimensions and dense-day overflow. Legends only include visible-in-export records, preserve category order and use Other for missing categories. Publication wrappers add calendar/custom title, human readable range, IANA display timezone, APP_VERSION, optional timestamp, and wrapped category key. Capture uses explicit publication DOM with outer padding; it does not capture app controls/sheets/tooltips.

GridView adds export-only custom title/subtitle/timestamp and density inputs plus a live status preview. Detailed has greater scale/cell capacity and dimensions. Dense days use an accessible actionable `+N more` indicator. Day Type desktop previews use a viewport-clamped fixed panel after pointer delay or focus, full whitespace-preserved text, Details/Edit actions, and Escape; touch still opens the full Day Detail route. The sheet now preserves full notes and scrolls inside its max-height panel.

## Verification
- Node test files: all `tests/*.test.mjs`, including `image-export-publication.test.mjs` (48 tests total, 48 passed, 0 failed, 0 skipped; 22.6s on the first complete successful execution).
- `pnpm --filter @workspace/lifegrid typecheck`: passed.
- `pnpm --filter @workspace/lifegrid build`: passed (existing sourcemap/chunk-size warnings only).
- Browser tooling/browser tests/manual desktop/manual mobile/export file inspection: not performed; no installed browser runner was found.
- Workspace typecheck/build and final `git diff --check`: recorded in final release validation.

## Defects and limitations
Fixed the 180-character preview limitation, two-line touch note clamp, absent export legend/metadata, and passive dense overflow. The preview has a direct DOMRect position calculation rather than collision-observer animation; visual, production, mobile keyboard/orientation and output-image inspection remain unverified. Recommended v0.4.17: dedicated mobile layout, safe-area/keyboard/orientation and browser screenshot audit.

**Branch:** `codex/implement-v0.4.16-grid-publication-experience`
**Commit / PR:** recorded after final commit/PR creation.
**Deployment:** not checked.
