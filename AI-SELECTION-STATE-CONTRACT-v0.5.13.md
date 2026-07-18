# AI review selection state contract — v0.5.13

`patchProposalKey(entityType, operation, recordId)` is the sole persistent proposal identity. `selectedRecords: Set<string>` is the sole source of truth. Checkbox `checked`, row/group counts, readiness input, dependency analysis, filtering, and apply all derive from that set. A parsed patch session initializes selectable, non-blocking keys once; warnings, rerenders, and StrictMode effect replay do not reset a session's user selection. A different parsed patch creates a new session and selection.
