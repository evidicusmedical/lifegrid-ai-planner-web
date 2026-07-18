# LifeGrid v0.5.0 — Project Operations Foundation

## Objective
A local-first Project Operations dashboard turns existing project, task, and event relationships into an operational workspace, with lightweight date-only milestones. No backend, account, cloud sync, or AI API was added.

## Operations
The Projects route shows active-calendar summary metrics, searchable/filterable/sortable cards, saved-order controls, derived task/event context, and a detail sheet. Progress is completed linked tasks / all linked tasks (parents and subtasks each count once). Next action is the first incomplete unblocked task sorted by explicit `nextAction`, urgent/high priority, due date, name, and ID. Health is derived: completed projects are Complete; two overdue task/milestone items are At risk; one is Attention; no tasks/milestones is No activity; lack of an unblocked next action is Attention; otherwise On track. Every state includes text explanation.

Milestones are project-owned `{id, projectId, title, targetDate, status, completedDate, notes, order}` checkpoints, not Tasks or Events. They support add, complete/reopen, reorder, and confirmed delete in Project Detail. Target dates are validated date-only strings.

## Compatibility
`APP_VERSION` is v0.5.0. AI interchange remains v4: current export includes milestone context, but v4 patch operations for milestones are explicitly unsupported. Backup schema remains 6 because milestones are an additive optional collection; old v5/v6 backups normalize it to `[]`. Calendar creation, empty, copy structure, duplicate, backup, and switching retain calendar isolation.

## Accessibility and mobile
Cards, filters, metrics, and touch-sized reorder buttons stack; cards/progress have accessible text and the detail dialog has a heading. Long names wrap. Browser manual verification is still required.

## Limitations / v0.5.1
No capacity, dependencies, Gantt, scheduling, milestone notes editor, or direct Project/Event editor launch from detail. Consider richer editing and browser coverage in v0.5.1.

Branch: `codex/implement-v0.5.0-project-operations-foundation`. Commit/PR URL/deployment status are recorded after release workflow; deployment not verified.
