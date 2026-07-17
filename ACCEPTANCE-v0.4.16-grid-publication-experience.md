# Acceptance — v0.4.16 Grid and Publication Experience

## Environment
- [ ] **Blocker:** Record browser/version, device, viewport, calendar and production version.
- [ ] Backup completed before testing; screenshot/export-file paths recorded: __________.
- Stop for data loss, inaccessible editor/close control, incorrect calendar isolation, clipped export, or export with wrong records.

## Day Type preview
- [ ] **High:** Hover delay opens expanded preview; pointer can enter it without flicker; preview stays in viewport.
- [ ] **High:** Title/date/category/full paragraph-preserved notes are visible and long notes scroll.
- [ ] **High:** Keyboard focus opens it, Escape closes it, Details works, Edit opens normal editor.
- [ ] **High:** Narrow/touch tap opens Day Detail, full notes scroll, and Close/Edit are reachable.

## Interactive grid
- [ ] **Medium:** Month boundaries scan clearly; past dates remain readable; Today and selected-Today coexist; focus is visible.
- [ ] **High:** Dense `+N more` is accurate/tappable and Day Detail shows all records.
- [ ] **Medium:** Long titles expose accessible full text; no Today header control or interactive regression.

## Image export
- [ ] **High:** Calendar/custom title, range, display timezone and version appear.
- [ ] **High:** Categories key contains only represented categories, preserves order, includes Other when needed and wraps without clipping.
- [ ] **Medium:** Compact and Detailed work; subtitle/timestamp work; preview count/dimensions update.
- [ ] **High:** Filter changes count/key, zero result blocks export, reset/date validation recover, filename is correct.
- [ ] **High:** No buttons/focus rings/sheets/menus in image; outer margins and readability are acceptable.

## Mobile and recovery
- [ ] **High:** Controls fit; density is touch usable; no unintentional horizontal overflow; intentional grid scrolling works.
- [ ] **Medium:** Keyboard/orientation/safe-area are safe; restore backup and confirm active calendar.

## Failure report
Severity: Blocker / High / Medium / Low
Environment: __________  Steps: __________  Expected: __________  Actual: __________  Screenshot/export: __________  Backup restored: yes/no
