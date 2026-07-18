# Grid browser results — v0.5.8

Browser automation was attempted with pinned `@playwright/test@1.55.0` as a dev dependency. Installation failed: `ERR_PNPM_FETCH_403 GET https://registry.npmjs.org/@playwright%2Ftest: Forbidden - 403` (no authorization header). No browser timings, screenshots, traces, videos, engine versions, or 11-second reproduction results are fabricated.

The v0.5.7 development-only marks and `window.lifegridGridTiming()` remain. When registry access is available: install with `pnpm --filter @workspace/lifegrid add -D @playwright/test@1.55.0`, then `pnpm exec playwright install chromium firefox webkit`; capture Tasks/Settings → Grid first/repeat on desktop, 390×844 and 768×1024 with cold/warm cache and service worker enabled/bypassed.
