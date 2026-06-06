# LifeGrid AI Planner — Code Review & End-User Analysis

> Reviewed June 2026 against codebase at HEAD (`main`).  
> App version: 0.2 + v0.2.1 reliability/PWA pass.

---

## 1. Executive Summary

LifeGrid is a well-structured, TypeScript-strict, client-only React/Vite PWA. All v0.2 features are implemented and the production build is clean. The codebase is readable, consistently organised, and follows patterns appropriate for a localStorage-based personal planning app. The main ongoing risks are the single large JS bundle (~621 KB gzipped ~185 KB), the inherent fragility of localStorage as the only storage layer, and the manual copy-paste nature of the AI integration — none of which are code quality issues, but they define the ceiling of the product's reliability and growth.

---

## 2. Architecture Assessment

### Storage
- **Single context (`AppDataContext.tsx`)** owns all state and persistence. This is appropriate at this scale; the file is long (~420 lines) but well-organised into sections (types, hooks, CRUD, backup).
- **Versioned storage key** (`lifegrid_store_v5`). Migration runs once on load; the legacy `lifegrid_data` key is cleaned up after migration.
- **Backup timestamp** (`lifegrid_last_backup`) tracked separately so Settings can show how stale the last backup is.
- **AI draft** (`lifegrid_ai_draft_v1`) persists across tab-switches with a 72-hour TTL — good UX for mobile where apps are backgrounded.

### Component structure
- Clear page/component split: `pages/` for full-tab views, `components/` for re-used panels and forms.
- Sheets (EventSheet, TaskSheet, PersonEventSheet) follow a consistent open/close prop pattern.
- `DayDetailSheet` correctly composes the per-day drill-down without adding another router.
- `ui/` contains only shadcn/Radix primitives — correctly treated as read-only infrastructure.

### Data model
- All cross-references use string IDs (category name / person ID). This keeps the schema flat and survives partial data corruption.
- `Task.schedulingNotes` is a free-text string intentionally excluded from the main display but included in every AI export — correct decision for a field whose consumer is an LLM, not a human UI.
- Calendar versioning stores full snapshots (events, tasks, person-events) per named version. Storage cost is O(versions × events) — reasonable for personal use, but worth noting for users with many events across many versions.

### AI integration
- `aiPrompt.ts` is cleanly separated from UI. Six prompt modes cover common planning needs.
- `fixTime` normalizer + `normalizeEventUpdate`/`normalizeTaskUpdate` handle the most common AI output deviations (missing leading zero, 12-hour clock, snake_case ids in update arrays).
- `ParsedUpdate.warnings[]` field is wired but not yet surfaced in the UI — acceptable for v0.2, but should be shown to users in a future pass (they currently get silent normalization).
- Image-prompt instruction `"⚠️ REVIEW: ..."` in notes is a good lightweight signal for users to verify uncertain AI extractions.

---

## 3. Code Quality

| Area | Assessment |
|---|---|
| TypeScript strictness | Strict mode on; zero `any` escapes in application code (only typed as `any` in AI JSON parsing where it's correct) |
| Unused imports/variables | None found — typecheck passes clean |
| Error handling | All localStorage reads/writes wrapped in try/catch with graceful fallbacks |
| Consistency | File naming, component export pattern, and hook naming are consistent throughout |
| Dead code | `html2canvas` is still in package.json as a dependency but is no longer used (`html-to-image` replaced it for export). Can be removed. |
| Comments | Sparse but adequate — complex logic in `AppDataContext` (migration, calendar snapshot) would benefit from inline notes |
| Test coverage | Zero automated tests. Acceptable for a personal project; risky if the codebase grows or more AI-import parsing logic is added |

### File size concerns
The production bundle is a single JS chunk of **621 KB minified (185 KB gzipped)**. This is large for a mobile-first app. The app works correctly, but on a slow mobile connection the first load may be sluggish. Causes: all of `framer-motion`, all of `recharts`, and the full shadcn/Radix tree bundled together. No immediate action required, but dynamic imports for AIView and SettingsView would cut the initial chunk by ~30%.

---

## 4. End-User Experience Analysis

### Strengths
- **Mobile-first layout** — bottom nav, slide-up sheets, large tap targets throughout.
- **Offline-capable** — PWA service worker precaches all assets. After one online visit, the app loads fully offline. The amber offline banner gives clear feedback.
- **Non-destructive AI import** — applying an AI update into a new calendar version means the user's original data is never overwritten automatically.
- **Backup safety indicator** — the green/amber backup status in Settings gives the user a visible prompt when their backup is stale. This directly prevents data loss.
- **AI prompt quality** — the structured export with categories, scheduling notes, and date-range scoping produces prompts that get high-quality responses from Claude/ChatGPT.

### Weaknesses / known friction points
- **Copy-paste AI workflow** — users must manually copy the prompt, switch to an AI app, copy the response, switch back, and paste it in. This is friction that cannot be eliminated without a backend API connection, which is out of scope for this version.
- **No cross-device sync** — data lives in one browser. JSON backup/restore is the only transfer mechanism. Users who switch phones lose data if they forget to back up.
- **localStorage limits** — Safari allows ~5–10 MB per origin. A user with years of events across many calendar versions could hit this limit. There is no current warning. A rough usage estimate in Settings would be a valuable future addition.
- **Recurring event edit scope** — editing a recurring event in a series requires deleting all and recreating, or editing each individually. "Edit this and all future" is not yet implemented.
- **No undo** — deleting an event or clearing a calendar has a confirmation dialog but no undo. The JSON backup is the only recovery path.
- **`ParsedUpdate.warnings` not surfaced** — when the AI time normalizer fixes a time string, the user is not told. They may not notice the correction.

### Accessibility
- shadcn/Radix components provide keyboard navigation, ARIA labels, and focus management for free.
- Color-coded categories use both color and text labels — not color-only, which is good.
- Some status indicators (backup ✓/⚠️) are emoji-only with no `aria-label`. Minor improvement opportunity.
- Dark mode is implemented and toggleable in Settings.

---

## 5. Security & Privacy Assessment

- **No network requests from application code** — zero API calls, zero telemetry, zero external connections beyond loading the app itself.
- **No secrets** — no API keys, no OAuth tokens, no `.env` required at runtime.
- **All data stays in the browser** — localStorage is same-origin only; no other site can read it.
- **No PII transmitted** — the AI prompts are plain text that the user voluntarily copies into a third-party AI. The app itself never sends this data anywhere.
- **`.gitignore`** correctly excludes `*.zip`, `*.tar.gz`, `lifegrid-backup-*.json`, `.env`, and `dist/`.

No security concerns found.

---

## 6. PWA / Offline Assessment

| Item | Status |
|---|---|
| `vite-plugin-pwa` installed | ✅ `^1.3.0` in devDependencies |
| VitePWA plugin in vite.config.ts | ✅ Configured with Workbox `autoUpdate` |
| Web manifest generated | ✅ `manifest.webmanifest` emitted on build |
| Service worker generated | ✅ `sw.js` + `workbox-*.js` precaching 16 entries (732 KB) |
| PWA icons (192, 512, Apple) | ✅ Present in `public/` |
| Apple PWA meta tags | ✅ `apple-mobile-web-app-capable`, status bar, title, touch icon |
| Offline banner | ✅ Amber banner in App.tsx via `useOnlineStatus` hook |
| Install section in Settings | ✅ iOS/Android/desktop step-by-step instructions |
| SW disabled in dev (no HMR interference) | ✅ `devOptions.enabled: false` |

The build output confirms offline caching is working correctly. After installing the PWA and visiting once online, the app will load fully offline.

---

## 7. Recommended Next Steps (priority order)

### Immediate (low-effort, high value)
1. **Remove `html2canvas` from package.json** — it is unused since the export was migrated to `html-to-image`. Reduces bundle size slightly.
2. **Surface `ParsedUpdate.warnings[]` in the AI import UI** — show a yellow callout listing any time strings that were auto-corrected so users can verify them.
3. **Add localStorage usage estimate to Settings** — `JSON.stringify(localStorage).length / 1024` gives a rough KB count; show "Storage used: ~X KB of ~5 MB" to help users avoid hitting Safari's limit silently.

### Short-term (moderate effort)
4. **Code-split AIView and SettingsView** — dynamic `import()` for these two heavy tabs would cut the initial JS payload by ~25–30%.
5. **"Edit this and all future" for recurring events** — currently missing; deleting+recreating a series is painful.
6. **Direct AI API option** — allow users to paste in an OpenAI/Anthropic API key (stored in localStorage, never sent anywhere) and have the app call the API directly, removing the copy-paste step.

### Longer-term
7. **Optional cloud sync via a lightweight backend** — even a simple Cloudflare Worker + R2 backup-on-demand would eliminate the cross-device problem without requiring a full backend.
8. **Undo stack** — in-memory undo for the last N mutations (delete event, clear calendar) would significantly reduce data-loss anxiety.

---

## 8. Build Verification (June 2026)

```
pnpm --filter @workspace/lifegrid run typecheck   → CLEAN (0 errors)
pnpm --filter @workspace/lifegrid run build       → SUCCESS
  dist/public/manifest.webmanifest  0.41 kB
  dist/public/sw.js                 (Workbox-generated)
  dist/public/assets/index.css    124 kB  (gzip: 19.7 kB)
  dist/public/assets/index.js     621 kB  (gzip: 185 kB)
  PWA: 16 entries precached (732 kB)
```

The chunk-size warning (>500 KB) is informational — it does not affect correctness. See §7 item 4 for the recommended fix.

---

## v0.3.1 Review Addendum — Usability and AI Admin Assistant Workflow

The v0.3.1 pass keeps the app local-first and avoids backend/API scope expansion. The main usability improvements are denser grid cells, clearer task/project guidance, yearly task repeats, safer backup/export wording, and a clearer AI Admin Assistant workflow that can support planning, coordination, drafting, and minimal JSON updates.

End-user impact:
- Grid days are easier to scan and exported PNGs include all events for each day.
- Routine AI planning should require smaller prompts and shorter AI responses.
- Simple task completions can be returned as `completed_task_ids` instead of full task rewrites.
- Users see AI notes and unknown-ID warnings before applying changes.
- JSON backup is distinguished from readable `.txt` and calendar-only `.ics` exports.

Remaining risks:
- AI output is still probabilistic; preview warnings should be reviewed carefully.
- Large full-context exports can still be slow or token-heavy; compact or JSON patch mode remains recommended for day-to-day use.
- Full external calendar import remains deferred because bulk ICS/CSV imports can create many records and should be versioned/tagged carefully.
