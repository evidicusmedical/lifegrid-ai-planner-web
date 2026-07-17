# LifeGrid v0.4.14 — Import Integrity, Backup Verification, and Immediate UX Refinement

## Objective
This local-first release makes reviewed AI additions and updates apply through an isolated atomic helper, while refining temporal review, ICS export, and editor guidance. Application version is `src/lib/version.ts`; AI interchange remains v4 and backup schema remains v6.

## Data integrity
`aiInterchange.ts` provides a React-independent structured parser result. `aiPatchApply.ts` validates dependencies, duplicate IDs, protected `other`, parent-first application (categories → people → projects → tasks → events → People Schedule), final references, and task cycles before returning a new AppData object. Legacy/v2/v3/v4 parsing remains in `aiPrompt.ts`; future versions are rejected. The UI still requires explicit review and approval.

`backup.ts` now exposes pure serialize, parse, normalize, and restore helpers. v5/v6 shaped stores are normalized conservatively; v6 round trips retain calendar identity, timezone, temporal fields, relationships, and recurrence IDs. Raw AppData imports remain new active calendars.

## UX
Time Data Review remains active-calendar-only and does not mutate records. ICS now includes approximate and unknown records automatically; markers explain their representation. Export labels use “Keep each event’s original timezone” and “Convert zoned events to UTC.” UTC preserves an instant but can change displayed local clock time; all-day/floating stay date/local-time based. TemporalFields explains every time type and handling mode. The Grid header Today navigation control is removed while its accessible cell highlight remains.

## Compatibility and limitations
No backend, accounts, AI API, cloud sync, deletion/merge AI operation, bulk repair, or broad mobile redesign was added. Browser/manual mobile verification is not claimed in this repository-only release.

## Roadmap
- **v0.4.15:** Guided Rapid Review queue/progress/resolve-skip-defer, people/project saved ordering with drag/keyboard/touch, per-calendar ordering, shared version/reference-time header.
- **v0.4.16:** Day Type hover/focus preview, fuller notes/mobile note view, image legend and metadata, dense/print image refinements.
- **v0.4.17:** Full mobile/resilience audit: navigation, touch targets, responsive tables, overflow, safe areas, keyboard/date inputs, AI/backup/export flows, PWA/offline/orientation/iPhone/Android/accessibility checks.

Branch: `codex/implement-v0.4.14-import-integrity-backup-ux`. Commit and PR are recorded after release workflow completion. Deployment was not verified.
