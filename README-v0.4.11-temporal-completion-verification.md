# LifeGrid v0.4.11 — Temporal Completion and Verification

This release completes display-timezone rendering while preserving source values. Zoned timed and approximate records are converted through one canonical occurrence helper; all-day, unknown, and floating records never move. The grid indexes the displayed start date and detail/People displays expose source timezone information when conversion occurs.

AI Interchange remains **v4**. Future versions are rejected; v3 and legacy shapes remain accepted. v4 event additions and merged updates are validated against the temporal model. DST gaps and ambiguous local wall times are rejected rather than silently resolved.

ICS defaults to source `TZID` (without `VTIMEZONE`: browser `Intl` cannot produce reliable historical VTIMEZONE definitions). A UTC mode exports valid unambiguous zoned instants with `Z`; floating and all-day records stay floating/date-only. ICS uses CRLF and UTF-8-safe folded lines. Unknown and approximate records remain opt-in.

Backups retain schema 6 and v5/v6 restore compatibility. Separate arrival/departure timezones remain out of scope. Grid presentation uses only the displayed start date for a multi-date record.

## Manual acceptance
Change a calendar display timezone; verify a New York late-evening event moves into Chicago’s displayed date when applicable, while all-day/floating stay fixed. Open the moved pill and verify editing retains source date/time/timezone. Create overnight, unknown, approximate, and People schedule entries. Export preserve-TZID and UTC ICS files, then optionally import them into an external calendar. Restore v5 and v6 backups and inspect Time Data Review. These browser/external checks were not performed by this patch.

Branch: `codex/implement-v0.4.11-temporal-completion-verification`. Deployment status: not verified.
