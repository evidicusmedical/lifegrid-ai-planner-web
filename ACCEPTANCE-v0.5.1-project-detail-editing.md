# v0.5.1 Manual Acceptance

**Environment:** Browser ____ Device ____ Viewport ____ Version v0.5.1 Test calendar ____ Backup completed ☐.  Screenshot: ____ Console errors: ____.

## Severity / stop conditions
Blocker: data loss, cross-calendar data, or inaccessible save; Critical: workflow cannot finish; Major: incorrect derived state; Minor: cosmetic. Stop and restore the backup for Blocker/Critical findings.

## Checks
- [ ] Open Project Detail; edit name, status, notes; cancel an edit; confirm dashboard refresh.
- [ ] Open Task editor; edit title/due date/priority; complete/reopen; confirm progress/health/next action refresh; cancel and confirm detail context.
- [ ] Open Event editor; edit title/temporal fields; retain relationship and confirm it remains; remove linked task and confirm it leaves; cancel and confirm context.
- [ ] Add/edit milestone title/target date/multiline notes; complete (check date-only completion); reopen (check cleared date); reorder; delete with confirmation and cancel deletion.
- [ ] At 390×844 and 768×1024, confirm rows fit, long notes wrap, Save/Cancel stay reachable with keyboard, and no body horizontal overflow.
- [ ] Keyboard navigate, check focus return and Escape top-layer behavior, labels/status/progress text and delete confirmation.
- [ ] Download/restore backup and verify milestone notes and completion dates; restore original backup and confirm active calendar.

**Recovery:** download original backup before testing; import it from Settings after testing; verify active calendar and records. Browser/device verification is pending; record browser, viewport, screenshots, and console errors above.
