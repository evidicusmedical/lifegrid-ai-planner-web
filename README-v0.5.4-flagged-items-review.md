# LifeGrid v0.5.4 — Flagged Items for Review

## Objective
Rename Time Data Review to **Flagged Items for Review** and keep it a local-first, derived audit for genuine validation errors and required clarification—not a recommendation inbox.

## Eligibility and noise policy
A flag must require correction, explicit confirmation, clarification, deletion, reference repair, or a registered migration decision. Valid all-day, unknown-time, approximate, start-only records, optional omissions, old valid records, long events, and AI origin alone are excluded. The v0.5.4 source is temporal validation plus the legacy all-day/unknown-time ambiguity; application-version, reference-validation, and allowlisted AI clarification sources are modelled but deferred.

## Workflow
The list shows stable issue keys, source, severity, reason, question, counts, filters, grouping, refresh time, and first-five/show-all. Blocking findings expose **Edit Record**, **Delete Record**, and only the two exact legacy actions: **Confirm All Day** and **Confirm Time Unknown**. Confirmations preserve date/unrelated fields and clear timed/timezone fields. No blocking finding can be ignored. Advisory ignore/restore persistence and bulk confirmation are deferred rather than simulated.

AI interchange remains v4 and does not ingest AI-defined review actions or clarification prose in this release. Backup schema remains 6. Mobile actions wrap with touch-sized controls and text severity/source labels.

## Verification and release
Branch: `codex/implement-v0.5.4-flagged-items-review`. Commit and PR URL are recorded after release creation. Deployment status: not verified. Known limitations: advisory sources, device-local ignore/restore, selected atomic bulk confirmation, and browser automation are planned for v0.5.5.
