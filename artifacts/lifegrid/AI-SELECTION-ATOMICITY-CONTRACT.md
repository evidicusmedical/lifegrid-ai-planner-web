# AI selection atomicity contract

`patchProposalKey(entity, operation, id)` is the canonical selection identity for review, dependency analysis, readiness, filtering, and final apply. At the apply boundary, the already-filtered patch deterministically reconstructs its selected set from every add/update record. A same-patch Project or parent Task must be included when selected Tasks reference it. The transaction validates before mutation and applies only the complete valid plan.
