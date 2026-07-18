# v0.5.5 bundle analysis

Production build output is captured by `pnpm --filter @workspace/lifegrid build`; Vite emits the authoritative chunk table. This patch did not claim a size reduction because no pre-change analyzer artifact was available. `html-to-image` remains imported by GridView and therefore remains on the Grid route path; it is a documented v0.5.6 candidate only. PWA Workbox precaches generated JS/CSS under its existing glob pattern, so any future lazy chunks must remain included for installed offline first use. No runtime analysis/telemetry dependency was added.
