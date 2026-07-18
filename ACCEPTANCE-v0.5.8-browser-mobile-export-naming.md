# Acceptance — v0.5.8

- [x] JSON complete-store backup uses `lifegrid_json_backup_Jon-s-Calendar_2026-07-17_16-08-05.json`; restore is filename independent.
- [x] ICS calendar export uses `lifegrid_ics_calendar_Jon-s-Calendar_2026-07-17_16-08-05.ics`; import/content are filename independent.
- [x] Fixed timezone timestamp, apostrophe, slash, colon, emoji/blank, long-name, and collision helper cases are tested.
- [x] Source implements scrollable filter rails, narrow sort layout, wrapping cards, safe-area FAB/list/nav/header behavior.
- [ ] Browser widths 320×568, 360×800, 375×812, 390×844, 430×932, and 768×1024: blocked by Playwright registry 403; no results claimed.
- [ ] Grid first/repeat timing, long tasks, console errors, traces/screenshots: blocked by the same installation error. Stop if errors/overflow occur; recover by preserving a trace and using the existing timing function.
