# Event Project, time, and multi-day contract

Event `projectId` is optional and canonical clearing is `null`; preflight accepts existing or selected same-patch Projects and blocks invalid/deselected references. Direct assignment is used first while legacy linked-Task inference remains readable.

Editors expose All day and Timed. Editing legacy approximate normalizes to Timed; unknown normalizes to All day. Person schedules use the same shared boundary, require both times for Timed, clear both for All day, and untouched stored records are never rewritten.

A canonical multi-day Event remains one source record with inclusive `date`/`endDate`. Grid, Day Detail, annual export, and targeted export expand display occurrences only; Repeat remains separately materialized.

Targeted export clips display expansion to the requested interval while retaining the source Event ID. Project deletion descriptions and controls count and update direct Event assignments even when no Task uses the Project.

For new Events, Multi-day and Repeat are adjacent and always visible. Multi-day means “One Event spanning consecutive dates”; Repeat means “Separate editable Event occurrences on a frequency.” Selecting either clears and disables the other, turning it off re-enables the other, Multi-day persists one `date`/`endDate` source record, and Repeat materializes independent occurrences.

Multi-day calendar-span ownership is explicit: its End Date control supplies the stored inclusive `endDate`, while the shared temporal fields supply normalized clock semantics. Timed Multi-day Events retain both required clock values; All-day Multi-day Events retain null clock values. Neither path creates additional source records.
