# v0.4.15 handoff

Repository confirmed at `/workspace/lifegrid-ai-planner-web`; the checked-out baseline contains merged PR #11 (`51704fa`) and preceding merged head `9db4d78`. Baseline version was v0.4.14, AI interchange was 4, backup schema was 6, and `AppDataContext` uses both `applyPatchAtomically` and production backup helpers.

## Audit and implementation

The prior Time Data Review only filtered and listed issues; it lacked section collapse, summaries, show-all, grouped collapsing, and editor launches. This release adds a compact collapsible summary, filter reset, first-five/show-all display, and stable test IDs. The pure `rapidReview` helper binds queues to a calendar, deduplicates stable keys, tracks resolve/skip/defer/unavailable states, reconciles deletions/new keys, and never mutates findings. Rapid UI is session-only and calendar switches safely terminate display.

People now use canonical `order`; Projects reuse their existing `order`. `entityOrder` provides immutable deterministic contiguous migration and move operations. Context normalizes data, appends new entities, and reorders only the active calendar. Calendar seed/duplicate, backup, restore, and AI export/import preserve ordinary data and normalization supplies legacy defaults. Project status is unchanged; ordering is global rather than an implicit status move. People page and Settings managers sort saved order and provide keyboard/touch-safe move buttons.

`AppHeader` is mounted once in `App`, uses `APP_VERSION`, active calendar name/timezone and UTC, titles long values, and owns one minute interval. No browser or manual desktop/mobile verification was performed. Node tests and typecheck are recorded in the final release report. Known limitation: Rapid Review guidance does not yet launch the sheets directly. Recommended v0.4.16: Grid/publication work; v0.4.17: comprehensive mobile patch. Deployment not verified.
