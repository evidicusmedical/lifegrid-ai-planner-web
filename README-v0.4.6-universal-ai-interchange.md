# LifeGrid v0.4.6 — Universal AI Interchange

## Objective
LifeGrid remains local-first, model-agnostic, and human-reviewed while making external AI exchange simpler and capable of creating complete schedules.

## User-facing changes
- AI Planner now has two workflows: **Export Current LifeGrid to AI** and **Build a New LifeGrid from External Information**.
- Current export asks only for a date range (Next 7/30/90 Days, Current Year, All Data, or Custom) and includes relevant categories, people, projects, tasks (completed and incomplete), events, and person schedules.
- The external-information starter package contains schema and safety rules but no current LifeGrid records.
- Canonical interchange is `lifegridPatchVersion: 3`; category, person, project, task, event, and people-schedule additions/updates are reviewable before apply. Legacy patch shapes remain parsed.
- AI import includes a convenient backup download using the existing restorable backup format and timestamped filename convention.
- The grid header visibly displays **LifeGrid v0.4.6**. The canonical UI/export source is `artifacts/lifegrid/src/lib/version.ts`; package release metadata is `artifacts/lifegrid/package.json`.
- Image-export range validation is derived from the current range in the export handler, avoiding persisted stale errors.

## Notes
No direct AI API, backend, authentication, cloud sync, OCR, or destructive AI deletion operations were added. The current domain does not model person-to-event links beyond person schedule entries.

## Release record
- Branch: `v0.4.6-universal-ai-interchange`
- Commit: `4f82016a05afb3daa61c0d25042d4237eaaff0e4`.
- Pull request: not available in this local checkout.
- Deployment verification: not performed. `pnpm --filter @workspace/lifegrid typecheck`, `pnpm --filter @workspace/lifegrid build`, and `git diff --check` passed locally; no repository test script is configured.

Future releases use `README-vX.Y.Z-[patch-name].md` for concise summaries and `HANDOFF-vX.Y.Z-[patch-name].md` for detailed engineering records.
