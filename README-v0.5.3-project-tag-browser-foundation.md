# LifeGrid v0.5.3 — Project Tag UX and Browser-Test Foundation

## Objective
Completes the lightweight Project Tag workflow without restoring a Projects route or Project Operations dashboard. The canonical version is `src/lib/version.ts` (`APP_VERSION = 'v0.5.3'`).

## Project Tag workflow
TaskSheet now uses an accessible, searchable selector. It retains `task.projectId`, searches trimmed case-insensitive canonical names and aliases in saved order, exposes alias-match context, supports arrows/Enter/Escape, and provides a clear action. Active tags are the default; an existing archived assignment is retained and labelled, and a missing ID is displayed as unavailable rather than as a valid tag.

A non-empty, conflict-free query can open a compact Create Project Tag dialog (name and color). It applies Settings validation, creates a stable ID through AppDataContext, assigns only the Task draft, and returns focus to the selector. It does **not** save the Task; closing the Task leaves the newly created tag but discards the assignment.

Events derive read-only tags through `linkedTaskIds → Task.projectId → Project Tag`; no event field is stored. EventSheet and Day Detail show canonical color/text chips, including an Archived label, with deduplication and saved ordering.

## Browser test architecture and coverage
No browser runner was installed before this patch. Adding pinned `@playwright/test` 1.57.0 was attempted but npm registry access returned `ERR_PNPM_FETCH_403`; therefore no dependency, configuration, or results are fabricated. Browser-ready stable selector test IDs are limited to `project-tag-combobox`, TaskSheet close, and Day Detail event controls. The planned Playwright matrix is Chromium, Firefox, WebKit, Mobile Chromium, Mobile WebKit, at 390×844 and 768×1024, with isolated localStorage seeding and failure-only traces/screenshots once package access is available. CI is unchanged so normal builds never require browsers.

## Mobile, accessibility, and performance
The list is internally scrollable, touch-sized, width constrained, and long labels wrap/truncate safely. Roles include combobox/listbox/option, expanded state, active descendant, live result count, and labelled dialogs. Filtering is a pure, memoized selector calculation and reuses existing helpers; no runtime combobox dependency or production-bundle dependency was added.

## Compatibility and status
Backup schema remains 6; AI interchange remains v4 and continues to describe Projects as lightweight tags. Local-first behavior, atomic import, Standard Time Data Review, and invisible legacy milestones remain. Known limitation: browser execution awaits registry/browser access. v0.5.4 should install Playwright and run the planned full focused matrix, including deterministic fixture setup and CI.

- Branch: `codex/implement-v0.5.3-project-tag-browser-foundation`
- Commit: recorded after final verification.
- PR URL: recorded after PR creation.
- Deployment: not verified; production URL was not changed by this local patch.
