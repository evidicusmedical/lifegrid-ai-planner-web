---
name: LifeGrid aiPrompt.ts architecture (v0.3.2 → v0.4.4)
description: compact mode is primary admin prompt; project-reorg mode added in v0.4.4 Pass 3; PlanningOptions extended; normalize* accept tag/tags aliases.
---

## Key patterns

### adminAssistantIntro signature
`adminAssistantIntro(data, requestLabel, includeProjectsTags = true)`  
Projects+Tags block is conditional on `includeProjectsTags`. Defaults to true.

### PlanningOptions fields (current)
```ts
promptType?: PromptType;
focusStart?: string | null;
focusEnd?: string | null;
includeTasks?: boolean;           // default true
includePeople?: boolean;          // default true
includeCompletedTasks?: boolean;  // default false
includeProjectsTags?: boolean;    // default true
targetProjectId?: string | null;  // for project-reorg mode; default undefined
```

### compact mode = primary admin prompt
The `compact` prompt type is the general-purpose, range-aware LifeGrid Admin prompt. It's what users see first (AIView defaults to it).

### project-reorg mode (added v0.4.4 Pass 3)
New `PromptType` value `'project-reorg'` in `generatePlanningPrompt`.
- Reads `targetProjectId` from opts to find a specific project or default to "build new"
- Generates a two-mode prompt: BUILD (no target) vs REORGANIZE (target selected)
- Shows project tasks + other incomplete tasks + moveable events + fixed events (context-only)
- Uses `patchSchemaReference` for output format (same as other patch-producing modes)
- AIView shows a project `<select>` dropdown (data-testid="select-target-project") inside the `<details>` section when this prompt type is selected
- `targetProjectId` is persisted to the `Draft` localStorage object

### normalize* tag/category aliases
`normalizeEvents`, `normalizeTasks`, etc. accept `e.tag`, `e.tags[0]`, and `e.category` interchangeably. AI output often uses "tag" — makes imports robust.

### Adding a new prompt type: checklist
1. Add to `PromptType` union
2. Add to `PROMPT_TYPES` array (emoji, title, description, badge?)
3. Add to `OBJECTIVE` record
4. Add any new `PlanningOptions` fields needed
5. Add destructuring in `generatePlanningPrompt`
6. Add a branch before `// ── Standard modes` comment
7. If the mode needs UI inputs in AIView, add state + Draft field + useEffect deps + reset + UI
