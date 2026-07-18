# PWA startup contract v0.5.15

`manifest.webmanifest` declares `id`, `start_url`, and `scope` as `/`, standalone display, valid colors, 192/512 PNG icons, and a maskable 512 icon. `index.html` links the manifest and Apple touch icon, declares iOS standalone/status metadata, and uses `viewport-fit=cover`. HTML is no-cache on Vercel while hashed assets are immutable. No new service worker is shipped: online launch reliability takes precedence over speculative offline shell caching. Previous installations should be removed and re-added after deployment so iOS replaces an obsolete icon URL.
