# v0.4.13 Manual Browser Acceptance

**Environment:** ____  **Browser/device:** ____  **Build/version:** v0.4.13  **Tester/date:** ____

## Before testing
- [ ] Download a v6 backup first. Expected: recovery copy named `lifegrid_json_backup_<calendar>_<date>_<time>.json`.
- [ ] Use only `artifacts/lifegrid/src/fixtures/temporal-acceptance-calendar.json` and the fictional AI/backup fixtures.

## Checks
- [ ] Load/refresh/incognito. Expected: no startup or console error; local data survives refresh.
- [ ] Create Empty, Copy Structure, and Duplicate calendars; switch repeatedly. Expected: no cross-calendar records.
- [ ] Create all-day, zoned, floating, unknown, approximate, overnight, and multi-date Events and People Schedule entries. Expected: source values remain intact; display-zone conversion affects only zoned records.
- [ ] Attempt DST gap and fold values. Expected: save is blocked with a clear validation message.
- [ ] Open Settings → Time Data Review. Expected: filters and stable issue labels identify Event/Person Schedule findings.
- [ ] Export ICS in Preserve TZID and UTC modes; toggle unknown/approximate. Expected: default exclusion, visible inclusion markers, CRLF ICS, and appropriate dates/times.
- [ ] Restore fictional v5 and v6 backups. Expected: calendar isolation, active calendar, temporal fields, and display timezones are retained/migrated safely.

## Failure report
`Severity (S1 data loss / S2 blocking / S3 incorrect output / S4 cosmetic): ____`  
`Steps, expected, actual, console output, fixture, screenshot: ____`

## Stop and recovery
Stop on data loss, cross-calendar leakage, unhandled exception, or invalid backup restore. Restore the pre-test backup, refresh, retain the downloaded artifact, and report an S1/S2 issue. Google Calendar import and production deployment verification are intentionally not claimed here.
