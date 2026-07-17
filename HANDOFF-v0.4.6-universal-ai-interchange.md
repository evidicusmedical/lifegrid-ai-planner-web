# Engineering Handoff — LifeGrid v0.4.6 Universal AI Interchange

## Release record
Repository: `evidicusmedical/lifegrid-ai-planner-web`. Production reference: https://lifegrid-ai-planner-web-lifegrid.vercel.app/. Starting branch/commit: `work` / `bcae3a2`. Final branch: `v0.4.6-universal-ai-interchange`. Target version: `v0.4.6`. Final commit: `4f82016a05afb3daa61c0d25042d4237eaaff0e4`. PR and deployment verification are not available/performed in this checkout.

## Architecture
The former specialized AI modes and optional context controls were replaced in the AI page by two universal workflows. `lifegridPatchVersion: 3` is the canonical interchange format. It is an additive patch format rather than a backup replacement: adds/updates for categories, people, projects, tasks, events, and `peopleSchedule` are normalized then held for explicit user approval. Existing v2 and legacy minimal patches remain accepted by `parseAIUpdate`.

Current-export filtering applies to dated events and person schedule entries; tasks due in range and undated tasks remain contextual. Categories referenced by included work plus `other`, and all people/projects provide relationship context. The external starter prompt has no AppData serialization.

Apply order is categories, people, peopleSchedule, projects, events, tasks. The `other` fallback category cannot be updated. Duplicate/invalid category/person/schedule identifiers are warned/rejected during parsing. Existing domain types have no availability model separate from `PersonEvent`, so `peopleSchedule` is the canonical representation and `availability` is accepted as an alias.

## Other changes
The backup button delegates to `downloadCurrentBackup`, which calls the existing `exportBackup` serializer and preserves `lifegrid_json_backup_<calendar>_<date>_<time>.json`. `APP_VERSION` in `src/lib/version.ts` is the canonical UI/AI metadata value; package metadata is 0.4.6. The Grid header uses it on desktop and mobile.

Image export checks range at export time from current filters. This avoids an independently stored validation error surviving corrected inputs, preset changes, calendar changes, or reopening the dialog.

## Verification
Focused fixture files were added for an existing-calendar update and a fictional six-provider / three-shift schedule. `pnpm --filter @workspace/lifegrid typecheck` passed. `pnpm --filter @workspace/lifegrid build` passed with existing source-map and bundle-size warnings. `git diff --check` passed. No repository test script is configured. Browser/mobile manual verification and deployment verification were not performed at handoff time.

## Files
Core changes: AIView, aiPrompt, AppDataContext, GridView, version and backup helpers, package metadata, fixtures, and this release documentation. Known limitation: preview is a compact grouped preflight rather than a per-record dependency graph; related references are still normalized and the domain only exposes person schedules, not generalized event/person relations. Recommended next patch: add focused automated parser/dependency and image-dialog regression tests plus a per-record blocked-dependency UI.

Future release documentation naming: `README-vX.Y.Z-[patch-name].md` (concise) and `HANDOFF-vX.Y.Z-[patch-name].md` (engineering/verification record).
