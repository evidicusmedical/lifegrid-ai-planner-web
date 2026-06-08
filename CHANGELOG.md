# LifeGrid AI Planner — Changelog

All notable changes to this project are documented here.

---

## v0.4 — June 2026

### Final polish pass

- Added an AI-ready planning model with first-class projects, task due-date classification, task triage status, event display priority, and project-aware AI patch v2 import/export.
- Improved JSON backup download filenames to `lifegrid_json_backup_[calendar-name]_[YYYY-MM-DD]_[HHmm].json` with sanitized calendar names.
- Simplified the Event sheet by removing user-facing per-event grid/export visibility toggles; `showInGrid` and `showInExport` remain normalized internal fields reserved for a future Export Studio.
- Restored intuitive export behavior: the normal grid no longer hides events by per-event flags, TXT/ICS exports include normal calendar/grid events, and PNG export can choose Visible or Expanded mode.
- Updated readable TXT export with project status/order/aliases, task due-date type, task triage status, and event display priority.
- Deferred export filtering/presets, full Export Studio, People/calendar import, and multi-calendar AI comparison/export to v0.4.1/v0.5.

---

## v0.2 — June 2026

### Features Added (T001–T008)

**Data Model & Multi-Calendar**
- Multi-calendar (version) support: create, rename, duplicate, delete, switch calendar versions
- Calendar data stored in a versioned store (`lifegrid_store_v5`); migration from `lifegrid_data` (v1) is automatic
- Custom categories: add, rename, recolor, delete — events/tasks recolor automatically when a category changes
- Custom people: add, rename, recolor, delete — person-events cascade on delete
- `Task.schedulingNotes` field — free-text constraints/dependencies that are exported in AI prompts

**UI/UX Improvements**
- Settings tab (5th tab) with: CalendarVersions, CategoryManager, PeopleManager, DataManager
- Day-detail sheet: tapping a multi-event cell shows all events for that day
- Add-event FAB on grid
- Category focus toggle (chip filter) on Grid and Tasks views
- Quick mark-done on task cards
- Human-readable relative dates on Tasks view
- Delete confirmations (AlertDialog) on all destructive actions

**AI Planner Overhaul**
- Multiple prompt types: Full analysis, Find conflicts, Find free time, Work–life balance, Add prep & buffers, Summary digest
- Date-range scoping: analyze just a focus window; rest of calendar sent as context
- Import modes: paste text/ICS/CSV, or photo/screenshot upload to AI
- Prompt download as `.txt` — for AI apps that don't support clipboard paste
- File-upload response import — upload the AI's `.txt`/`.json` response
- Apply AI changes into a new calendar version (non-destructive import)
- 3-day draft persistence — survives tab-switching on mobile

**Export Fix**
- Replaced `html2canvas` with `html-to-image` for PNG export — fixes broken export with modern `hsl(…)` CSS colors

**JSON Backup**
- Download full backup `.json` from Settings → Data & backup
- Restore from backup (full store restore with multi-calendar support)
- Export as readable `.txt` for sharing/printing

---

## v0.2.1 — June 2026 (reliability & PWA pass)

### Fixes

**Backup restore**
- `importBackup` now correctly restores `activeCalendarId` from the backup file instead of always activating the first calendar

**AI import validation**
- `startTime` / `endTime` fields now validated and normalized (12-hour → 24-hour, single-digit hours padded)
- `update` arrays in AI responses now run through the same normalizers as `add` — dates fixed, unknown categories fall back to "other"
- `generateImagePrompt` now instructs the AI to flag ambiguous/partially-visible dates with `⚠️ REVIEW:` in the notes field

### New Features

**Backup safety reminder**
- Settings → Data & backup shows last backup date with a green/amber indicator
- Warns when no backup has been taken, or when the last backup is 7+ days old

**PWA / offline support**
- Added `vite-plugin-pwa` with Workbox app-shell caching strategy
- Web app manifest: name, short name, icons, theme color, standalone display
- PWA icons: 192×192, 512×512 PNG + SVG, 180×180 apple-touch-icon
- `<meta name="theme-color">` + Apple PWA meta tags in `index.html`
- Offline banner: amber bar shown when network is unavailable
- Settings → Install & use offline: step-by-step guide for iOS, Android, and desktop

**Portability**
- `vite.config.ts` no longer throws when `PORT`/`BASE_PATH` env vars are missing — defaults to `3000` / `/` for local dev and CI builds

**Repo hygiene**
- `.gitignore` updated: `*.zip`, `*.tar.gz`, backup JSON patterns, `.env*`
- Removed stray `lifegrid-export.tar.gz` from repository root

### Documentation
- `CHANGELOG.md` — this file
- `OFFLINE_PWA_INSTALL_GUIDE.md` — step-by-step PWA install guide for iOS, Android, and desktop
- `CODE_REVIEW_AND_END_USER_ANALYSIS.md` — full code review, architecture assessment, end-user analysis, risks, and recommended next steps
- `PROJECT_HANDOFF.md` — updated: PWA/offline limitation corrected, env vars noted as optional with defaults, file map updated with PWA icons and `useOnlineStatus` hook, `lifegrid_last_backup` storage key documented
- `EXPORT_CHECKLIST.md` — updated: run commands no longer require `PORT=` / `BASE_PATH=` prefixes

### Build verification (June 2026)
- `pnpm typecheck` → **CLEAN** (zero TypeScript errors)
- `pnpm build` → **SUCCESS** — emits `manifest.webmanifest`, `sw.js`, `workbox-*.js`; PWA precaches 16 entries (732 KB)

## v0.3.1 — Usability and AI Admin Assistant Workflow

### Improvements

Grid density, ordering, and export
- Grid cells now show up to four compact events interactively where space allows.
- Events inside each grid cell are sorted by all-day/no-time first, timed events by start time, then saved category/tag order.
- Overflow remains visible as a +N more indicator, while PNG export expands rows to include all events.
- Image export now defaults to faster compact quality, shows progress text, disables export controls while generating, and exposes a mobile-friendly Fast/Sharp quality toggle.

Tasks and projects
- Task repeat creation now supports yearly frequency in addition to daily, weekly, bi-weekly, and monthly.
- Task cards show status prominently alongside due date, tag/category, priority, and constraints.
- Task and project helper text clarifies that tasks should be small actionable items and projects/tags should group larger efforts for focus mode.

AI Admin Assistant workflow
- Renamed the schedule analysis entry point to "Copy AI Admin Assistant Prompt."
- Rewrote the AI Planner "How it works" flow around selecting context, copying a prompt to any AI/LLM, asking for planning/drafting help, and pasting raw JSON back when ready.
- Reworked AI focus options around administrative planning, free-time/meeting coordination, task prioritization, project breakdown, message/email drafting, and bulk JSON updates.
- Exported prompts now include category/tag order, project structure, selected schedule/task/person context, robust cross-LLM instructions, ambiguity handling, and raw-JSON-only import rules.
- The JSON patch schema supports new_events, updated_events, deleted_event_ids, new_tasks, updated_tasks, completed_task_ids, project/category/tag assignments, and notes.

Settings and exports
- Simplified "Install & use offline."
- Clarified that LifeGrid data is stored locally in the current device/browser and that JSON backup is the primary restorable save point.
- Moved readable .txt export out of backup/restore into a separate non-restorable exports section.
- Added .ics export for calendar/grid events only, for import into external calendar apps.

### Calendar import planning
- Full ICS/Google CSV/Outlook import is deferred. Future imports should default to an Imported tag/category, prefer separate calendar versions for safety, and allow AI-assisted retagging/merging afterward. People schedules can later import into the People tab.

### Migration notes
- No storage-key migration is required for v0.3.1.
- Existing calendar data, category order, projects, backups, and offline/PWA behavior remain compatible.

### Known limitations
- AI integration is still copy/paste or file-upload based; there is no external AI API call, account login, cloud sync, or backend.
- Large calendars/task lists may still take external AI models longer to process.
- ICS export includes grid/calendar events only; tasks, projects, and People tab entries remain available through JSON backup and text export.
- The app accepts minimal AI patches, but unknown IDs are still warnings that should be reviewed before applying.

## v0.3.2 — Yearly Grid Recurrence + Simplified AI Admin Prompt

### Improvements

- Added yearly repeat support for grid/calendar events, using the existing recurring-group/event-instance behavior so generated occurrences remain normal event records for grid display, JSON backup, PNG export, and ICS export.
- Simplified the AI Planner primary workflow around one Copy LifeGrid Admin Prompt action.
- Added date-range controls for Next 14 days, Next 30 days, Next 90 days, Full selected calendar, and Custom range.
- Added LifeGrid Admin prompt data-inclusion controls for tasks, people availability, completed tasks, and projects/tags. Defaults are Next 30 days, incomplete tasks, people availability, projects/tags, and no completed tasks.
- Rewrote the primary exported prompt to explain the LifeGrid Admin Assistant role, local-first context, cross-LLM usage, ambiguity handling, preserving commitments, conversational planning, and the final raw JSON patch workflow.
- Clarified that tags and categories are the same shared LifeGrid organizing concept; prompts now include tag/category order and task category/project fields, and parser normalization accepts tag/category aliases.
- Improved raw JSON patch instructions for new_events, updated_events, deleted_event_ids, new_tasks, updated_tasks, completed_task_ids, deleted_task_ids, and notes, including projectId and category/tag assignment guidance.

### Known limitations

- AI remains copy/paste or file-upload based; there are no external AI API calls, auth, backend, or cloud sync.
- Repeating grid events are generated as individual normal event records at creation time; there is still no rule-based recurring-event engine or "edit this and future" workflow.
- Large full-calendar prompts may still exceed or slow some external AI model contexts; users should narrow the range or disable optional context when needed.
- Offline/PWA behavior and JSON backup/import/export behavior are unchanged.
