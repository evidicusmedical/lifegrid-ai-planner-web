# v0.4.17 Manual Acceptance

**Environment:** Browser: ______ Device: ______ Viewport: ______ Production version: v0.4.17 / Test calendar: ______ / Backup completed: [ ] / Console errors: ______ / Screenshot: ______.

## Time Data Review (severity: blocker for data mutation/stale-calendar defects)
- [ ] Rapid Review, Skip, Defer and progress UI are absent.
- [ ] Settings explanation is clear; collapse, summary counts and filters work.
- [ ] Open an Event issue, correct/save, and confirm automatic refresh removes it.
- [ ] Open a Person Schedule issue, save unchanged, and confirm it remains; then correct/save and confirm removal.
- [ ] Make a temporal change elsewhere; use Refresh Review; confirm new/unresolved issues and Last refreshed.
- [ ] Switch calendars; confirm prior findings disappear and inactive records never appear.

## Mobile foundation (test 320×568, 375×667, 390×844, 768×1024)
- [ ] No body horizontal scrolling; Grid retains only intentional internal scrolling.
- [ ] Header is readable; long calendar name/timezone is safe.
- [ ] Review filters stack, cards fit, Refresh is touch-friendly.
- [ ] EventSheet, PersonEventSheet and DayDetailSheet fit; close/save are reachable after orientation change.
- [ ] Safe-area spacing and sheet viewport height are correct.

**Stop conditions:** unintended data mutation, stale calendar findings, inaccessible save/close control, or body-level horizontal overflow. **Recovery:** restore the completed backup, reload, and record viewport/screenshot/console output before filing a defect. Severity: blocker (data loss/accessibility), major (workflow blocked), minor (layout/copy).
