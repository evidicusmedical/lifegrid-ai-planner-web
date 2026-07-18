# v0.5.2 Acceptance

**Severity:** Blocker = data loss/navigation failure; Major = required workflow unavailable; Minor = presentation/accessibility defect. **Stop** on any Blocker, console exception, orphan `Task.projectId`, or backup round-trip loss. Record screenshot path and console errors for every failure. Recovery: restore a schema-6 backup, archive rather than delete a tag, and reopen the app.

## Checklist
- [ ] Desktop and 390×844 mobile navigation show Grid, Tasks, People, AI, Settings only; `#projects` falls back to Tasks and Back remains predictable. Screenshot: ___ Console: ___
- [ ] Open/collapse Project Tags; create, rename, recolor, add aliases, reject duplicate names/alias conflicts, search/clear, reorder, archive/unarchive, and read usage counts. Screenshot: ___ Console: ___
- [ ] Assign/clear active tag on a Task; search name and alias; ensure archived existing assignment is visible and unavailable for a new Task; verify a missing tag is unavailable. Screenshot: ___ Console: ___
- [ ] Link Tasks to Events; verify deduplicated one/multiple derived Tags and update after unlink. Screenshot: ___ Console: ___
- [ ] Delete unused Tag; for used Tag cancel, clear, and reassign; confirm Tasks/Events survive and no orphan IDs exist. Verify milestone-bearing tag warns/blocks and archive works. Screenshot: ___ Console: ___
- [ ] Download/restore backups with Tags and legacy milestones; confirm archive state and Task IDs. Export AI context, confirm tag language and atomic invalid import rejection. Screenshot: ___ Console: ___
- [ ] At 390×844 and 768×1024, verify editor/delete dialog Save/Cancel, wrapping aliases, safe-area reachability and no body horizontal overflow. Screenshot: ___ Console: ___
