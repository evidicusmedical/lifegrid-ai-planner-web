# LifeGrid v0.5.15 — Mobile startup reliability

LifeGrid now has a root-only standalone launch manifest and a pre-React startup shell. The Home Screen starts `/`, not a saved hash route; `/`, an empty hash, and an unknown hash safely use Grid. This release removes the generated offline-first service worker because cached HTML can reference deleted Vite chunks. Existing workers and Cache Storage can be safely removed by recovery without touching LifeGrid calendar storage.

The browser support floor is current iOS Safari, Android Chromium, and evergreen desktop browsers with ES2020 module support. Optional browser APIs are feature detected. AI interchange remains v4 and backup schema remains v7.
