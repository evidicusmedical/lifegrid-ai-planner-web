# Acceptance — v0.5.18

- A filtered patch derives final selection from its included add/update records using `patchProposalKey`.
- Project/Task dependencies are checked against that set before mutation; imports remain atomic.
- Event additions and sparse updates preserve `timeStatus`, `endDate`, times, and `recurringGroupId`.
- No timezone conversion, Project Operations, milestone operations, or UI expansion is included.
