# LifeGrid v0.4.10 — Temporal Model and Timezone Foundation

## Objective
This local-first release adds explicit temporal meaning without converting ambiguous legacy records. Events and people schedule entries now carry `endDate`, `timeStatus`, `timeZone`, and `timeZoneMode`.

## Temporal behavior
- **All day** is date-only and never shifts during display or export.
- **Timed** records need start/end times; overnight records use an explicit inclusive end date.
- **Time unknown** remains date-known but is excluded from ICS by default.
- **Approximate** is labeled and excluded from ICS by default.
- **Zoned** times retain an IANA source zone; **floating** times retain their wall-clock time.

Each calendar has its own display timezone. The event editor exposes time type, end date, timezone handling, and common IANA zones. Settings includes a read-only Time Data Review. ICS emits DATE values with exclusive DTEND for all-day records, TZID local values for zoned records, and floating values for floating records; no VTIMEZONE is generated, so target calendar TZID support is required.

AI Interchange is v4 and exports temporal fields plus the calendar display timezone. Legacy/v2/v3 parsing paths remain accepted. Backup schema v6 preserves the added fields while v5 inputs normalize safely.

Known limitation: travel has one authoritative event timezone, not separate departure/arrival zones. Header-clock and browser/manual external-calendar verification were not performed in this environment.

Branch: `codex/implement-v0.4.10-temporal-timezone-foundation`
Commit: recorded in repository history at release finalization
Pull request: pending
Deployment: not verified.
