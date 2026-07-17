# LifeGrid v0.4.15 — Rapid Review and Workspace Organization

This local-first release adds a compact Time Data Review baseline, a guided Rapid Time Review queue, saved per-calendar People and Project ordering, and a shared LifeGrid version/reference-clock header. Rapid Review never changes records automatically: corrections remain in the normal editor workflow. Ordering is stored inside each calendar, included in backups, and optional in v4 AI interchange. The header uses `APP_VERSION`, the calendar display timezone, and UTC with a single one-minute timer.

## Safety and compatibility

Backup schema remains 6 and AI interchange remains 4. Existing people and projects receive deterministic contiguous order during normalization. Empty calendars have no people/projects; copy structure and duplicate retain orders. Mobile controls use explicit move buttons. Browser automation was not added because no browser runner is installed.

## Roadmap and status

Known limitation: Rapid Review currently offers guided skip/defer and standard-editor guidance; full in-card editor handoff is scheduled for a follow-up. v0.4.16 will address Grid/publication presentation. v0.4.17 is the dedicated comprehensive mobile optimization release. Branch: `codex/implement-v0.4.15-rapid-review-workspace-organization`. Commit and PR URL are recorded after release creation. Deployment status: not production-verified.
