---
name: LifeGrid sample data versioning
description: How the app forces a fresh seed of sample data when sampleData.ts changes
---

The app stores data in localStorage under `lifegrid_data`. A separate key `lifegrid_data_version` holds a version string (currently `"3"`).

On mount, `AppDataContext.tsx` checks the stored version against `CURRENT_VERSION`. If they don't match, it clears `lifegrid_data` and loads `defaultData` from `sampleData.ts`.

**Why:** The screenshot/preview browser reuses localStorage, so updating sampleData.ts alone won't refresh stale cached data. Bumping the version string forces a clean re-seed.

**How to apply:** Any time you update `sampleData.ts` with new default data, increment `CURRENT_VERSION` (e.g., `'3'` → `'4'`) in `AppDataContext.tsx`.
