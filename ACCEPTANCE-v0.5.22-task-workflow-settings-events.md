# Acceptance — LifeGrid v0.5.22

## Automated contracts
- Eight Task sorts, exact descriptions, deterministic ranks/ties, undated-last date modes, and realistic Smart ordering with urgent/blocked undated Tasks above far-future ordinary work.
- Canonical null due-date clear with unrelated-field preservation.
- Parser-level blocked-status enforcement, combined status/triage preservation, and update-plus-delete Blocked merge with disclosure.
- Repeated all-day, timed, and approximate siblings receive valid per-occurrence same-day or duration-preserving ranges for later weekly/monthly dates. Explicit all-day end edits remain subject to temporal validation; untouched valid ranges persist and missing/stale ends repair to the start date, including notes-only edits.
- Notes-only materialized recurrence edits default to Entire series, can be scoped to This event, and update the correct siblings.
- Project/People ordering normalization and JSON persistence remain deterministic.
- 16 unique, documented perceptual color families and arbitrary-current-color retention.
- Archive/timezone-mode source controls remain absent and v0.5.22 markers remain present.
- Existing Node suites retain atomic apply, parent references, backup, local-time, ordering, service-worker retirement, and dense-grid/export independence coverage.

## Supported manual recurrence acceptance
1. Edit notes on a grouped Event and confirm Entire series is initially selected.
2. Save Entire series and confirm all materialized siblings receive all three notes fields.
3. Repeat with This event and confirm only the selected sibling changes.
4. Change a structural field and confirm no series scope is offered or applied.
5. No “This and following” claim or control is present.

## Browser/device follow-up
Run the remaining manual checklist in the handoff on desktop Chromium and physical iPhone Safari. Do not mark a browser/device complete without execution.
