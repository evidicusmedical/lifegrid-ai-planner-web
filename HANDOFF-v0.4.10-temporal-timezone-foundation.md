# v0.4.10 Handoff — Temporal Model and Timezone Foundation

## Audit and starting state
Repository confirmed at `/workspace/lifegrid-ai-planner-web`. The checked-out starting commit was `0ce437b`, merge PR #6; it contains required head `ca2ed22af15a625ba24e49f9ae4a9a6b32ba9299`. The pre-change version source `src/lib/version.ts` was v0.4.9 / interchange 3. Calendar isolation was present. Event had date/startTime/endTime but no endDate, timezone, or time status; PersonEvent had the same constraints. The editor used date/time inputs and converted multi-day events to separate all-day siblings. Grid sorted on null startTime. Text/ICS export used floating dates/times. Backup schema was v5.

## Implementation
`TimeStatus` is all-day/timed/unknown/approximate; `TimeZoneMode` is zoned/floating. Timed source values have an inclusive `endDate`; same-date equal/end-before start is rejected. Zoned entries require an IANA zone, floating entries have no persisted zone, and all-day/unknown entries have neither. `Intl` validates IANA zones. The migration makes day types all-day, clear legacy timed records floating timed, and conservatively marks start-only, equal-time, and null-time records for review instead of claiming all-day.

Calendars store an independent `displayTimeZone`, defaulted from the browser; copy structure/duplicate retain the source zone, while empty/sample default to browser zone. Settings changes only the active calendar and warns before a visible conversion. Time Data Review is aggregate/read-only. Backup writes v6 and accepts v5 stores.

ICS uses exclusive DATE DTEND for all-day data, TZID local values for zoned events, floating local values otherwise, CRLF, stable UID, and opt-in unknown/approximate controls with custom markers. No VTIMEZONE is emitted: consumers must resolve standard IANA TZID. This is documented risk. The current AI package exports display timezone and original temporal fields; version is v4. Legacy parsers remain structurally available, though v4 temporal validation needs expanded dedicated coverage.

## Files
Changed: `artifacts/lifegrid/package.json`, `src/types/index.ts`, `src/lib/version.ts`, `src/lib/temporal.ts`, `src/context/AppDataContext.tsx`, `src/components/EventSheet.tsx`, `src/components/PersonEventSheet.tsx`, `src/pages/SettingsView.tsx`, `src/pages/AIView.tsx`, `src/lib/aiPrompt.ts`.
Added: this handoff and README.

## Verification
Executed: package typecheck and existing package tests. Existing tests pass; their legacy title still says “v3-only” and should be updated in v0.4.11. Browser desktop/mobile, image export, root build, manual DST, Google Calendar import, and deployment checks were not performed yet. Recommended v0.4.11: complete display conversion/header clocks, PersonEvent temporal editor parity, AI v4 strict parser validation, and dedicated temporal/DST/ICS tests.

Branch: `codex/implement-v0.4.10-temporal-timezone-foundation`. Commit: recorded in repository history at release finalization; PR metadata recorded (URL not returned). Deployment: not verified.
