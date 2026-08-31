# LifeGrid v0.5.29 handoff

## Current convergence state

- Existing PR: #53 — LifeGrid v0.5.29 — Operational export layouts and print-friendly framing
- Branch: `codex/implement-lifegrid-v0.5.29-updates`
- Requested reviewed head: `a2582b66296e804de5fd9ef0d5182aa60881a9ed`
- Failed hosted qualification: `33428725029`
- Supplied workspace snapshot: `fad95d7` on base `9169dda53a787badfc8a3dfa84ec022cb2c2a0ad`; GitHub fetch/API inspection was blocked, so the requested reviewed head could not be independently fetched.
- Final correction/head: record after commit and successful push.

## Architecture and corrections

The deterministic planner is the sole publication-family authority. Its semantic layout controls mounting, capture-node selection, renderer targeting, diagnostics, and validation mode. Orientation is selected before non-month frame width, typography, legend estimation, feasibility, and pixel-ratio planning. Rolling publications always provide seven range-relative headings; month matrices remain Sunday-first. Off-screen agenda dates use stable diagnostic attributes while retaining `aria-hidden`. DOM agenda cards and Canvas2D consume the same planned line count, font size, line height, and card geometry. Publication Light/Dark scopes include the background, foreground, border, card, muted, primary, primary-foreground, and ring tokens used by captured content.

Intentional trade-offs remain unchanged: unusually dense content may grow beyond exact Letter ratio, and only genuinely exceptional titles receive bounded final-line truncation. No storage or AI interchange migration was introduced.

## Verified local results

- Unit suite: 180 passed, 0 failed, 0 skipped.
- Typecheck: passed.
- Production build: passed; only the existing Vite chunk-size advisory was emitted.
- `git diff --check`: passed.
- Playwright browser installation blocker:
  - `pnpm --filter @workspace/lifegrid exec playwright install --with-deps chromium firefox webkit` failed because the environment proxy returned HTTP 403 for Ubuntu package repositories.
  - `pnpm --filter @workspace/lifegrid exec playwright install chromium firefox webkit` failed with HTTP 403 for `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1187/chromium-linux.zip`, its Microsoft mirror, and `https://cdn.playwright.dev/builds/chromium/1187/chromium-linux.zip`.
- No local Chromium, Firefox, or WebKit pass is claimed.
- Hosted successor run, Vercel successor result, and review-thread dispositions remain pending a successful push and hosted qualification.

Manual physical-device checks remain recommended for iPhone/iPad saving and US Letter print preview. Codex did not merge PR #53.
