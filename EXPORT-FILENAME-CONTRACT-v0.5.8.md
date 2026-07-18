# Export filename contract — v0.5.8

Shared pure helper: `artifacts/lifegrid/src/lib/exportFilenames.ts`.

Grammar: `lifegrid_<descriptor>_<slug>_<YYYY-MM-DD_HH-mm-ss>[_N].<extension>`.

| Export path | Descriptor | Example |
| --- | --- | --- |
| Preserve your LifeGrid / AI backup | `json_backup` | `lifegrid_json_backup_Jon-s-Calendar_2026-07-17_16-08-05.json` |
| Settings calendar ICS | `ics_calendar` | `lifegrid_ics_calendar_Jon-s-Calendar_2026-07-17_16-08-05.ics` |

The timestamp is export-generation time in the active calendar display timezone. Invalid/missing zones safely fall back to UTC. Names are Unicode-normalized, accents decomposed, apostrophes/unsafe punctuation/space runs converted to hyphens, repeated/edge separators removed, controls/path traversal blocked, and capped at 80 characters. Empty or emoji-only names become `Calendar`. Collision index support supplies deterministic `_2`, `_3` suffixes for callers that produce multiple exports in one second.

JSON remains a schema-6 complete-store/all-calendar backup; filename does not affect restore. ICS content, line folding, timezone and UID rules are unchanged; import ignores filename. Tests inject a fixed instant and cover exact JSON/ICS examples, timezone fallback, sanitizer edges, long names, and collision suffixes.
