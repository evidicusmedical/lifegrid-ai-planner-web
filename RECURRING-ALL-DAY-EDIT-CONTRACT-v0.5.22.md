# Recurring all-day edit contract — v0.5.22

LifeGrid recurrence is a group of materialized sibling Event records linked by `recurringGroupId`; it is not a generated master/rule engine. Every repeated all-day sibling receives its own `date` and `endDate`. One-day repetitions use `endDate = date`; multiday repetitions preserve the first occurrence's inclusive duration with stored YYYY-MM-DD arithmetic.

When an existing all-day Event's end date is explicitly edited, that value is authoritative. Original inclusive duration is preserved only when the start date changes and the end-date control was untouched. This applies to ordinary and grouped Events and prevents an end date earlier than the edited date.

For a notes-only edit in a materialized group, the editor shows **Entire series** (default) and **This event**. Entire series updates `notes`, `aiNotes`, and `sourceNotes` on every sibling; This event updates only the selected record. Structural edits remain single-event edits. LifeGrid does not expose or claim an unsupported “This and following” scope.
