---
name: LifeGrid PWA & reliability setup
description: Key decisions from the v0.2.1 reliability + PWA pass — what was added, why, and how it's wired up.
---

## PWA setup
- `vite-plugin-pwa` installed as devDependency in `@workspace/lifegrid`
- `VitePWA({ devOptions: { enabled: false } })` — SW is NOT activated in dev mode to avoid cache confusion
- Icons are solid-color PNGs (rgb 37,99,235 = #2563eb) generated via Python raw-PNG bytes — no PIL/canvas needed
- Files: `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, `public/apple-touch-icon.png` (180×180), `public/pwa-icon.svg` (3×3 grid on blue, for reference)
- `index.html` has full Apple PWA meta tags + `<link rel="apple-touch-icon">`

**Why:** VitePWA with Workbox precaches the app shell; localStorage data is always available offline regardless. devOptions disabled because in Replit dev the SW intercepts HMR requests and breaks hot-reload.

## Backup timestamp
- Key: `BACKUP_TS_KEY = 'lifegrid_last_backup'` in `AppDataContext.tsx`
- Context exposes `lastBackupAt: string | null` + `recordBackup(): void`
- `recordBackup()` is called in `SettingsView.DataManager.handleExport` — so the timestamp updates automatically when user downloads a backup
- UI in DataManager shows green/amber indicator; amber if >7 days or never backed up

## importBackup fix
- Old: always set `activeCalendarId: calendars[0].id` — wrong if user had a non-first calendar active
- New: preserves `incoming.activeCalendarId` if it matches one of the restored calendars, else falls back to `calendars[0].id`

## aiPrompt.ts normalizers
- `fixTime(raw)` — normalizes time strings: `"9:00"→"09:00"`, `"9:00 AM"→"09:00"`, `"9:00 PM"→"21:00"`, null if unrecognized
- Applied to `startTime`/`endTime` in both `normalizeEvents` (add array) and new `normalizeEventUpdate` (update array)
- `normalizeEventUpdate(u, validCats, colorMap)` + `normalizeTaskUpdate(u, validCats)` — update-array items now run through the same validation as add-array items
- `ParsedUpdate.warnings?: string[]` added for future use (not yet populated)
- `generateImagePrompt` now instructs AI to flag ambiguous/partial dates with `⚠️ REVIEW:` in the event's notes field

## vite.config.ts portability
- PORT/BASE_PATH no longer throw — default to `"3000"` / `"/"` so `vite build` works in CI and local dev without any env vars
