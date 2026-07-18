# LifeGrid v0.4.18 Mobile Acceptance

**Tester:** ____  **Date:** ____  **Device/OS:** ____  **Browser/version:** ____  **Build/commit:** ____  **Network:** ____

Severity: **Blocker** data loss/crash; **High** core workflow unavailable; **Medium** workaround exists; **Low** cosmetic. Stop and export a backup for Blocker/data-loss risk. Attach **screenshot:** ____ **screen recording:** ____ **console errors:** ____ **exported files/names:** ____.

## Viewport/device matrix
Run each relevant checklist at: [ ] Small phone 320×568 [ ] Standard phone 360×640 / 375×667 [ ] Large phone 390×844 / 412×915 [ ] Tablet portrait 768×1024 [ ] Tablet landscape 1024×768 [ ] iPhone Safari [ ] Android Chrome [ ] Installed PWA [ ] Offline mode.

## Global
- [ ] No body horizontal scroll; long names wrap/truncate safely.
- [ ] Header shows version/calendar/reference time/UTC; safe areas and bottom navigation are usable.
- [ ] All labelled routes switch in one tap; active route is clear; Browser Back is predictable.
- [ ] Rotate while Grid, a sheet, review, and an export form are open; state/usable position is retained.
- [ ] Touch targets, errors, and sticky actions are readable and reachable.

## Grid and editors
- [ ] Pan the Grid without accidental cell activation; tap date opens Day Detail, event tap edits its event, and +N is accurate.
- [ ] Day Type full notes, timezone details, Today state, Day Detail close, and scroll restoration work.
- [ ] Event, Person Schedule, Task, Project, and Person editors fit; keyboard does not permanently hide Save/Cancel; validation stays near fields; date/time semantics remain correct.

## Review, entities, and AI
- [ ] Refresh Review works; review-originated save reanalyses; filters/groups work; no Rapid Review/Skip/Defer appears; calendar isolation holds.
- [ ] Tasks/Projects/People cards, filters, completion, schedules, reordering, and editors remain understandable.
- [ ] AI export/starter prompt, paste/file preflight, dependency block, subset apply/counts, collapsed raw JSON and wrapping work.

## Backup and publication
- [ ] Backup filename/download and JSON mobile picker/restore result/recovery instructions work; double-tap cannot submit twice.
- [ ] ICS original timezone/UTC, presets/custom dates/errors/count/download work.
- [ ] Image density/metadata/legend/filter/count/dimensions/zero-result/large warning/export and download fallback work.

## PWA/offline and recovery
- [ ] Install/manual install and home-screen launch work where supported.
- [ ] After an online load, offline launch exposes local data; local edits, backup, text/ICS export, image export (if supported), then reconnect work.
- [ ] Simulate/observe storage failure: clear user-facing failure, no false success, no silent storage clear; download backup before recovery.
- [ ] Recovery: stop writes, capture console/screenshots, export any readable backup, do not clear browser storage, record browser storage state, then retry in supported storage context.

**Result:** [ ] Pass [ ] Fail  **Defects/links:** ____
