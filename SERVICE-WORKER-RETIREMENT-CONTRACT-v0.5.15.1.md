# Service-worker retirement contract — v0.5.15.1

## Safety invariants

- `retireLegacyServiceWorkersOnce()` is bounded to 750 ms and errors are diagnostics only; application mount continues.
- Every service-worker registration for the current origin is unregistered.
- Only Cache Storage keys beginning (case-insensitively) with `workbox-`, `vite-pwa-`, `lifegrid-`, `precache-`, or `runtime-` are removed by page startup. Unrelated origin caches remain.
- Startup never clears Local Storage and never opens, deletes, or migrates IndexedDB. Calendar backup/schema data is unchanged.
- A controller, removed registration, or removed known asset cache requests one `lifegrid-refresh=v05151-*` navigation. Session storage limits this to one automatic reload, including if session storage itself is unavailable.
- Static retirement workers at `/sw.js` and `/service-worker.js` call `skipWaiting`, delete their own worker cache storage, unregister, and navigate clients. They contain no fetch handler and no offline cache.
- Vercel sends worker and version endpoints with `no-cache, no-store, must-revalidate`; worker endpoints also declare JavaScript and `Service-Worker-Allowed: /`.
