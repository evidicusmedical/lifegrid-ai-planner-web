# LifeGrid v0.4.12 — Temporal Workflow Completion and Acceptance

## Objective
This local-first release completes Person Schedule temporal editing, adds actionable temporal review, and adds reproducible behavioral verification. It adds no account, backend, cloud synchronization, direct AI provider, or hosted-calendar feature.

## What changed
- **Shared temporal fields:** Event and Person Schedule sheets use `TemporalFields` for time type, inclusive end date, zoned/floating handling, IANA choices, validation, and a concise summary.
- **Person Schedule parity:** all-day, timed, unknown, approximate, floating, zoned, overnight, and multi-date source values are supported. Zoned records default to the active calendar display timezone; DST gaps and folds are rejected.
- **Review navigation:** Settings > Time Data Review indexes individual active-calendar Event and Person Schedule findings, supports record/type filters, and gives safe normal-editor guidance. It does not mutate data or bulk-repair records.
- **ICS:** existing TZID/UTC export options retain floating wall-clock times; unknown and approximate records remain opt-in.
- **AI and backups:** Universal AI Interchange remains v4; backup schema remains v6 and the included v5/v6 fixtures are fictional.

## Fixtures and acceptance
`artifacts/lifegrid/src/fixtures/temporal-acceptance-calendar.json` contains fictional records for Chicago display, New York/UTC/zoned/floating/overnight/all-day/unknown/approximate/DST cases and person schedules. The adjacent AI and backup fixtures are import samples only; they contain no production data.

Manual browser checklist: import the fixture into a disposable local browser profile; create each Event and Person Schedule time type; switch display timezone and verify zoned records move while all-day/floating do not; reopen converted records and save unchanged; try 2026-03-08 02:30 and 2026-11-01 01:30 America/New_York and confirm save is blocked; correct a review finding in its normal editor; export TZID and UTC ICS, verify floating/all-day/opt-in markers in file text, and restore v5 then v6 fixtures. Browser automation is not installed, so browser and external-calendar import verification remain manual and were not claimed.

## Limitations
LifeGrid has one source timezone per timed record; separate departure/arrival timezones and VTIMEZONE payload generation are intentionally out of scope. TZID exports rely on calendar-client zone databases.

Branch: `codex/implement-v0.4.12-temporal-workflow-acceptance`. Commit and PR URL are recorded after release creation. Deployment status is not asserted by this document.
