---
name: LifeGrid AIView onboard card visibility
description: The "Build a starter schedule" card must always be shown on the AI choose screen, not conditionally hidden when data exists.
---

## Rule

The "Build a starter schedule" / onboard `ModeCard` must **always render**, regardless of `hasData`. Use contextual `description` and `tag` props instead of a conditional render.

**Why:** E2e tests (and users) expect all three AI mode cards to be discoverable at any time. When data exists, the card is useful as "generate a sample version to explore" — hiding it breaks discoverability and causes test failures.

**How to apply:** In `AIView.tsx`, use `hasData` only to change the card's text, not to gate its render:

```tsx
<ModeCard
  emoji="✨"
  title="Build a starter schedule"
  description={hasData
    ? "Generate a sample schedule as a new calendar version to explore or reset your planner."
    : "Starting fresh? Get a realistic example schedule to kickstart your planner."}
  tag={hasData ? "Creates new version" : "New to LifeGrid"}
  tagColor="text-violet-600 dark:text-violet-400 bg-violet-500/10"
  onClick={() => setMode('onboard')}
/>
```
