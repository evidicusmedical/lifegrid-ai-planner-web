# Event project, time, and multi-day contract

`Event.projectId?: string | null` is additive; null is canonical unassignment and non-null IDs validate against Projects. Category remains required. Project usage and deletion clear/reassign both Tasks and directly assigned Events; hover prefers the direct Project and may read one legacy linked-Task fallback.

Editors expose only All day and Timed. Approximate reads/displays as Timed and unknown as All day, but stored records are not bulk rewritten. Editing normalizes the state; Timed requires both times. New AI records use only canonical states.

Multi-day is one Event with inclusive `date`/`endDate`; Repeat remains separately materialized occurrences. The creation controls clear/disable one another. Existing materialized groups remain unchanged.
