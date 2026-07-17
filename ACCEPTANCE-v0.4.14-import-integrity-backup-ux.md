# v0.4.14 Acceptance Checklist

**Environment:** Browser: ____; Device: ____; viewport: ____; production version: v0.4.14; test calendar: ____; pre-test backup downloaded: [ ].

**Stop condition (Critical):** stop immediately for data loss, partial import, orphan records, or restoring over the only production copy. Use fictional fixtures only. Screenshot/file: ____.

## AI (Critical)
- [ ] Valid v4 parses; invalid/future v4 blocks.
- [ ] Category/person deselection cascades; project cascade is transitive.
- [ ] Valid subset applies with no orphan/unrelated changes; duplicate patch blocks.

## Backup (Critical)
- [ ] Restore fictional v5; confirm migration, calendars, active calendar.
- [ ] Restore fictional v6; confirm temporal fields, multiple calendars, active calendar.
- [ ] Download, restore again, and confirm semantic round trip.

## Time Data Review (Major)
- [ ] Explanation is clear; section/groups collapse; summary and Show All work.
- [ ] Event and Person Schedule findings open normal editors; correction disappears; filters persist; no mobile overflow.

## ICS and temporal fields (Major)
- [ ] No inclusion checkboxes; approximate/unknown export and are marked.
- [ ] Original-timezone/UTC descriptions are clear and expected.
- [ ] Time Type/Handling explanations wrap without editor overflow.

## Grid and recovery (Major)
- [ ] Header Today button is absent, today cell remains highlighted, year controls work.
- [ ] Restore pre-test backup; confirm calendars, active calendar, and retained data.

**Failure template:** severity (Critical/Major/Minor): ____; steps: ____; expected/actual: ____; fixture: ____; screenshot: ____; exported backup: ____.
