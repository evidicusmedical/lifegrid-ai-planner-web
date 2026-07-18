# LifeGrid v0.5.11 — Restore Full-Year Grid

## Emergency corrective release

v0.5.10 replaced LifeGrid's compact annual table with progressively admitted, full-width `GridMonth` sections. Because those sections were rendered from mount priority, July could be inserted before June and the page grew into a vertical month stack.

v0.5.11 selectively restores the pre-v0.5.10 annual table: one compact, horizontally scrollable calendar with January through December in fixed column positions. Current and selected days remain highlighted in their normal cells; they never determine layout position.

## What was reverted and retained

Removed: the incremental mount scheduler, admitted-month JSX mapping, full-width monthly section component, and export preparation tied to admitting months. Retained: the v0.5.9 year-first summary model, memoized month data, displayed-year filtering, full-event lookup by ID for detail/editing, and local development diagnostics.

## Performance note

This release prioritizes stable product composition over speculative incremental mounting. The compact summary model avoids retaining notes and other full-record data in annual cells. Any further browser-performance work must preserve the fixed annual layout contract.

## Verification

The automated suite includes annual-layout source/model contracts, including the July-priority June-before-July regression. Run the documented package tests, benchmarks, typechecks, and builds before release. Browser scripts are not defined in this workspace, so browser acceptance remains a deployment/manual follow-up.
