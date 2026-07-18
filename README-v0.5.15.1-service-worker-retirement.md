# LifeGrid v0.5.15.1: Service-worker retirement

This release retires the legacy offline application shell so that deployed HTML and JavaScript are delivered from the network after one bounded recovery refresh. It deliberately does **not** change AI prompt quality, calendar schemas, or local-time Grid behavior.

At startup, LifeGrid keeps the static shell visible, installs diagnostics, safely retires origin-scoped worker registrations, deletes only named PWA asset-cache namespaces, and reloads at most once per browser session when a legacy controller, registration, or known cache was found. Calendar data in `lifegrid_store_v5` and IndexedDB are never cleared.

The app exposes `public/version.json` for independent release verification and embeds the same version in HTML. `/sw.js` is a termination-only worker with no fetch handler.
