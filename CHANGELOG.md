# LifeGrid AI Planner — Changelog

All notable changes to this project are documented here.

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
