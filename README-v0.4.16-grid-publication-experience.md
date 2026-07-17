# LifeGrid v0.4.16 — Grid and Publication Experience

## Release objective
v0.4.16 makes the local-first year grid more readable while making image exports suitable for sharing and print reference. No account, backend, cloud sync, direct AI API, or data-model migration is introduced.

## Grid and Day Types
Day Type pills now expose an expanded desktop preview after a short pointer pause or keyboard focus. It contains the Day Type title, date, category, complete text notes (preserving paragraphs), and Details/Edit actions. Escape closes the preview. On touch, a normal tap continues to open the existing Day Detail sheet, which now displays full scrollable notes and retains the normal editor route.

Dense cells keep deterministic priority sorting and show an accessible `+N more` control that opens Day Detail. Month headings retain their strong border/contrast, weekends remain subtle, past dates are muted without hiding category colour, and Today/selected/focus states remain separately signalled. The shared shell header remains the only LifeGrid version/reference-clock header; no Today header control was restored.

## Publication export
Every export now has a **Categories** key constructed from exported records only, in saved category order, with a safe Other fallback. The header includes calendar/custom title, human-readable range, display IANA timezone, and canonical app version; optional subtitle and generated timestamp are export-only. Compact and Detailed modes alter capture scale, capacity and dimensions without changing saved grid preferences. The export preview status reports metadata, count, legend count and approximate dimensions.

Export capture is DOM capture through `html-to-image`; publication-only content excludes application controls, sheets, focus/hover state, menus and tooltips by capturing an explicit publication wrapper with safe padding and a neutral background.

## Accessibility and mobile status
Keyboard focus opens the Day Type preview and Escape closes it; legend entries have labels, overflow has accessible text, and export fields are labelled. New export controls wrap at narrow widths. Browser/manual desktop and mobile verification were not performed in this environment; v0.4.17 remains the dedicated comprehensive mobile audit/redesign release.

## Compatibility and version sources
`src/lib/version.ts` is the canonical `APP_VERSION` source (`v0.4.16`) used by AppHeader and export metadata. Package metadata is `0.4.16`; Universal AI Interchange remains v4 and backup schema remains v6.

## Test coverage
Node tests cover the pure legend, metadata, density/dimensions, and dense-day helpers in addition to the existing backup, AI, ICS, temporal, ordering and Rapid Review contracts. No browser runner is installed.

**Branch:** `codex/implement-v0.4.16-grid-publication-experience`
**Commit:** recorded after release validation
**Pull request:** created after commit
**Deployment:** production deployment was not checked in this release environment.
