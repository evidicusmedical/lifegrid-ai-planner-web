---
name: LifeGrid aiPrompt.ts v0.3.2 architecture
description: compact mode is now the primary range-aware admin prompt; PlanningOptions extended; adminAssistantIntro takes includeProjectsTags; normalize* accept tag/tags aliases.
---

## Key changes in v0.3.2

### adminAssistantIntro signature
Now: `adminAssistantIntro(data, requestLabel, includeProjectsTags = true)`  
The Projects+Tags block is conditional on `includeProjectsTags`. Old calls without the 3rd param still work (defaults to true).

### PlanningOptions new fields
```ts
includeTasks?: boolean;       // default true
includePeople?: boolean;      // default true
includeCompletedTasks?: boolean; // default false
includeProjectsTags?: boolean;   // default true
```

### compact mode = primary admin prompt
The `compact` prompt type is no longer "14-day quick summary". It is now the general-purpose, range-aware LifeGrid Admin prompt:
- Uses `focusStart/focusEnd` from opts (scoped) or the full calendar (unscoped)
- Respects all 4 new `PlanningOptions` flags
- Includes conversational AI instructions + patch schema
- **Why:** The AIView defaults to compact; it's what users see first.

### normalize* tag/category aliases
`normalizeEvents`, `normalizeTasks`, `normalizeEventUpdate`, `normalizeTaskUpdate` all accept `e.tag`, `e.tags[0]`, and `e.category` interchangeably. AI output often uses "tag" instead of "category" — this makes imports robust.

### patchSchemaReference updated rules
- new_tasks example now includes `"category": "category-or-tag-id"`
- updated_tasks example includes `"category"` too
- Rules note: "Tags and categories are the same LifeGrid classification system"
- New rule: "Ask/converse first if needed. When I say 'Output the final LifeGrid raw JSON patch only,' return this raw JSON object only."
