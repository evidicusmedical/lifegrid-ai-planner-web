---
name: LifeGrid AppData shape
description: The AppData type fields and the places that must be kept in sync when new top-level fields are added.
---

# AppData required fields

Any place that constructs a literal `AppData` object (not just a partial) must include ALL required fields or TypeScript will error. The canonical list as of v0.3:

```
categories: Category[]
people: Person[]
projects: Project[]      ← added in v0.3; was missing from sampleData.ts and caused TS2741
events: Event[]
tasks: Task[]
personEvents: PersonEvent[]
```

**Why:** `sampleData.ts` had `defaultData: AppData = { categories, people, events, tasks, personEvents }` — when `projects` was added to the type it broke. Pattern: every structural AppData extension requires a grep for `defaultData`, `emptyData`, etc. and adding the field with a sensible default (`[]`).

**How to apply:** After adding a new top-level field to the `AppData` type, immediately run `pnpm run typecheck` from `artifacts/lifegrid` to find every construction site.
