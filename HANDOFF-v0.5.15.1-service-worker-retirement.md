# Handoff — v0.5.15.1 service-worker retirement

## Historical audit

Repository history shows VitePWA was added in commit `6c62884` with `VitePWA({ registerType: "autoUpdate" })` and Workbox `generateSW` defaults. That convention generated and registered `/sw.js`, with generated Workbox helper chunks named `/workbox-*.js`; the project lockfile still records `vite-plugin-pwa` and Workbox packages. No committed registration at `/service-worker.js` or `/registerSW.js` was found, but both paths are supplied as safe static JavaScript endpoints to avoid SPA HTML should a historical/generated client request them. Current Vite configuration no longer configures VitePWA or any worker registration.

Audited locations: `artifacts/lifegrid/vite.config.ts`, app `index.html`, `public/`, package dependencies, generated-output conventions documented in `CHANGELOG.md`, and `vercel.json`. Vercel has no SPA rewrite; explicit worker static paths and headers precede asset rules.

## Operational notes

Verify a deployment without executing the app via `/version.json`, then inspect `/sw.js` to confirm it is JavaScript. The client checks `version.json` with `cache: 'no-store'`; a differing bundled/deployed version updates the visible startup advisory before mount when the shell is still present and records diagnostics. This release intentionally defers AI prompt-quality work.
