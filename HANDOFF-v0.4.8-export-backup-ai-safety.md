# Engineering Handoff — LifeGrid v0.4.8

## Repository state
- Repository confirmed: `evidicusmedical/lifegrid-ai-planner-web`.
- Base branch/history was inspected at start: current work started from merge commit `7eb0ca9`, whose parent PR #4 head is `eb24c41fc72bdd4541f9c78f92833bfad5c24c6e`; therefore PR #4 is present.
- Starting canonical version: v0.4.7; Universal AI Interchange: v3; two-workflow AI page, record selection, grid awareness, and image range validation were present.
- Target/final branch: `codex/implement-v0.4.8-export-backup-ai-safety`; target version v0.4.8.

## Architecture
- Backup serializer remains `exportBackup()` and serializes `{ app, version, exportedAt, store }`; both Settings and AI use `downloadCurrentBackup`. Scope is every stored calendar version. Full-store restore replaces the local store; standalone AppData becomes a new calendar.
- Settings groups JSON preservation separately from schedule sharing. JSON download uses timestamped `lifegrid_json_backup_<calendar>_<date>_<time>.json` naming.
- ICS is generated client-side from grid events only. It uses stable `id@lifegrid` UIDs, DATE for all-day events, floating local date-times for timed events, category and description fields, CRLF, and escaped commas/semicolons/backslashes/newlines. Location is unavailable in the event model; line folding is not implemented.
- `exportUtils.ts` centralizes ISO range presets, validation, inclusion, and summary. Settings ICS uses presets, category filter, reset, count, and zero-match disable. Image export retains its existing v0.4.7 controls.
- Text export remains human readable/non-restorable; it includes explicit section and field labels.
- `aiDependencies.ts` creates stable `group:operation:id:index` proposal keys, extracts actual supported references, indexes existing/proposed records, reports missing/deselected parents, tracks dependents, and detects simple cycles. UI deselection cascades direct/transitive children; reselecting a parent never reselects children. Group selection skips blocked entries. AppDataContext repeats dependency validation before any mutation, then existing update application maintains its parent-first category/people/project/task/event/schedule addition order. Validation happens before state mutation; this gives transaction-like all-or-nothing behavior for dependency failure.
- AI imports of 20+ records receive a non-blocking backup recommendation.

## Files
Changed: `artifacts/lifegrid/package.json`, `artifacts/lifegrid/src/context/AppDataContext.tsx`, `artifacts/lifegrid/src/lib/version.ts`, `artifacts/lifegrid/src/pages/AIView.tsx`, `artifacts/lifegrid/src/pages/SettingsView.tsx`.
Added: `artifacts/lifegrid/src/lib/exportUtils.ts`, `artifacts/lifegrid/src/lib/aiDependencies.ts`, this handoff, and release README.

## Verification
- Typecheck: `pnpm --filter @workspace/lifegrid typecheck` passed.
- LifeGrid build, workspace typecheck/build, and diff check are recorded after the final implementation run.
- No browser desktop/mobile, external calendar import, manual export, manual AI preflight, or production deployment verification was performed.
- Backup compatibility retained; AI interchange compatibility retained at v3.

## Risks and next patch
No dedicated test runner exists. Add focused unit tests for export presets/ICS escaping and graph cases, then browser-test download/import on desktop and mobile. ICS floating time and absent line folding/VTIMEZONE remain deliberate limited implementation risks.

Final commit: `241e6a16d07c0c50a6605ba6c7d8da4ec5925ee5`. PR URL was not returned by the available PR metadata tool; deployment status is unverified.
