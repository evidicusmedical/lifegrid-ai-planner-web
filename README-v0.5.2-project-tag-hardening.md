# LifeGrid v0.5.2 — Project Tag Hardening

## Objective
Project Operations, Project Detail, and visible milestone management have been removed. Projects remain lightweight **Project Tags** that organize Tasks and related Events without a separate workspace.

## Project Tags
Settings has a compact Project Tags manager with search, create/edit (name, color, aliases, notes), saved-order buttons, archive/unarchive, usage counts, and dependency-aware deletion. Names are trimmed and case-insensitively unique; aliases are normalized and conflicts with other Tags are rejected. Tasks store stable `projectId` values, and archived Tags remain visible on already-assigned Tasks while excluded from default choices.

Events derive their Tag context solely from linked Tasks. Usage counts are deterministic: open, completed, total Tasks and deduplicated related Events.

## Safety and compatibility
Used tags must be cleared from Tasks or reassigned to a different active Tag in one validated update; Events and Tasks are never deleted. Deletion is blocked when legacy milestones exist, recommending archive. Milestones remain legacy/unsupported data, retained by normalization and schema-6 backup round trips; no milestone UI or AI patch operations exist.

AI interchange remains v4 and atomic import validation remains in place. Prompts describe Projects as organizational tags and prohibit invented operational health/progress/next-action values. Backup schema remains 6.

## Mobile and accessibility
Rows wrap and controls are touch-sized; editor/dialog use dynamic viewport bounds. Labels identify search, state, reordering, deletion, and usage without color alone.

## Tests and limitations
Node behavioral tests cover tag validation, usage, derivation, archived selection, and atomic deletion planning. No browser runner is installed; manual acceptance is in `ACCEPTANCE-v0.5.2-project-tag-hardening.md`. v0.5.3 should add cross-browser automation.

Branch: `codex/implement-v0.5.2-project-tag-hardening`. Commit and PR URL are recorded after release creation. Deployment status: not verified.
