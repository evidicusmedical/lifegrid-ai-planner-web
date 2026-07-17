# LifeGrid v0.4.7 — Grid Situational Awareness

**Objective.** Improve the local-first year-grid planning workflow with clearer temporal context, concise note discovery, resilient image-export range validation, and a more reviewable AI import preflight.

## Product vision
LifeGrid remains a local-first, backend-free visual year planner. It keeps user review in control of model-agnostic AI JSON import, backup, ICS, and grid-image export.

## Grid awareness
* **Today** has a persistent labelled top marker and primary ring; the indicator is not dependent on category colour.
* **Past dates** use a restrained neutral surface and reduced opacity while retaining event pills and category colour.
* **Selected dates** use a separate inset foreground ring. Keyboard focus is layered above it using `focus-within`.
* Styling layers are: keyboard focus, selected, today, past, normal date.

## Details without grid clutter
Events with notes show an accessible note icon. Desktop pointer hover exposes concise native detail text; keyboard focus exposes the same text and Enter/Space opens the existing date details. On mobile, tapping an event opens the existing day-detail sheet, avoiding hover-only or precision-gesture interactions. Notes are truncated in the compact description.

## Image export
Range validation is now a pure derived calculation from current start/end values and grid year. It clears immediately after correction, preset switching, or reset. Invalid ranges disable export and explain why; **Reset Export Range** returns to the current grid year. This prevents stale validation state from surviving edits or the export-options panel lifecycle.

## AI preflight
The two universal workflows remain. Preflight now lists proposed records individually by group with stable IDs, operation, and relevant date/category/person/project details. Groups and individual records can be selected; only selected add/update records are passed to apply. The Universal AI Interchange schema remains **v3**.

## Version and compatibility
The visible version is **LifeGrid v0.4.7**, sourced only from `artifacts/lifegrid/src/lib/version.ts`. Package metadata is 0.4.7. Existing backup format and filename conventions are unchanged. Legacy, v2, and v3 import parsing remains in place.

## Major modules
`GridView.tsx`, `AIView.tsx`, `lib/gridAwareness.ts`, and `lib/version.ts`.

## Upgrade, testing, and limitations
No migration is required. `pnpm --filter @workspace/lifegrid typecheck` passed during implementation. Browser automation is not configured in this repository and manual browser/device verification remains required, including image generation and viewport placement. AI dependency blocking remains a follow-up: record deselection is honored, but users should retain required parent records when selecting related children.

**Branch:** `codex/implement-v0.4.7-grid-situational-awareness`
**Commit:** the release commit on this branch
**Pull request:** created after commit
**Deployment verification:** not performed from this workspace.
