# LifeGrid v0.5.15 — Mobile startup reliability

LifeGrid now launches Home Screen installs from `/`, not a hash route. A valid standalone manifest, iOS metadata, startup shell, safe-area sizing, guarded storage access, and a root recovery boundary prevent an empty white document. v0.5.15 intentionally retires the prior offline app-shell service worker: online startup and deployment correctness take priority over speculative offline support. Calendar data remains in `localStorage`; clearing **cached app files** never clears it.

Supported floor: current iOS Safari, Safari 14+, and current Chromium. Optional browser features are detected; no Temporal or heavyweight polyfill is required. Old iOS icons can retain obsolete launch metadata: remove the old icon and add LifeGrid from `/` again after deployment.
