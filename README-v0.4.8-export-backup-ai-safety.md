# LifeGrid v0.4.8 — Export, Backup, and AI Dependency Safety

## Objective
Clarify local preservation versus sharing exports, add filter-aware ICS calendar export, and prevent reviewed AI imports from creating orphaned records.

## Product vision
LifeGrid remains a local-first, human-reviewed visual year-grid planner. It has no accounts, backend, cloud sync, or direct AI provider dependency.

## Workflows
- **Preserve Your LifeGrid:** JSON backup is timestamped, local, and restorable. It serializes the existing store (all calendar versions); restore replaces that store for a full backup, while a single AppData blob is imported as a new calendar.
- **Share or publish:** Readable text is explicitly non-restorable and intended for review, documents, printing, or plain-text sharing. ICS is for importing calendar/grid events into external calendar applications, not projects, tasks, people, or People-tab schedules.
- **ICS range and filter:** Current Month, Next 30/90 Days, Current Year, All Events, and Custom Range are available with immediate ISO-date validation, category filter, reset, count, and zero-match prevention. UIDs remain `event-id@lifegrid`; timed values are floating local times and all-day values are DATE values. Text is escaped for commas, semicolons, slashes, and newlines.
- **Grid image:** Existing range validation/reset and image layout are retained; its targeted export summary remains visible.
- **AI safety:** A pure dependency analysis checks categories, people, projects, tasks, events, and schedule entries. Deselecting a parent cascades to transitive proposed children. Blocked records cannot be selected/applied, and apply recomputes dependencies before mutation.
- **Large import advice:** imports of 20+ proposed records display a non-blocking backup recommendation.

## Compatibility and versioning
The visible version is **v0.4.8**, from `artifacts/lifegrid/src/lib/version.ts`. Universal AI Interchange remains **v3** and JSON backup structure/naming remains compatible.

## Major modules
`SettingsView`, `AIView`, `AppDataContext`, `lib/backup`, `lib/exportUtils`, and `lib/aiDependencies`.

## Upgrade/deployment notes
No migration or backend change is required. Build and typecheck should be run before deployment.

## Known limitations
ICS has no location field because events have no location model; timed exports intentionally use floating local times rather than a generated VTIMEZONE. Browser/manual production verification was not performed in this release environment.

Branch: `codex/implement-v0.4.8-export-backup-ai-safety`  
Commit: recorded in the engineering handoff after release commit.  
Pull request URL: not returned by the available PR metadata tool.  
Deployment verification: not performed.
