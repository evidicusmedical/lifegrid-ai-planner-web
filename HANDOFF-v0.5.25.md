# LifeGrid v0.5.25 handoff

LifeGrid v0.5.25 makes targeted Grid PNGs reliable for Next 7, Next 14, Next 30, and Custom ranges. Targeted capture is staged at normal coordinates, independently of the annual publication/table and interactive scroll state, and generation validates measurable dimensions plus a non-empty PNG before opening Preview. The export Preview owns the interaction layer above persistent mobile navigation so Download remains reachable at narrow widths.

Next presets always resolve from LifeGrid's local today. Custom and relative targeted ranges may cross years up to 45 inclusive days. Events excluded with `showInExport: false` are removed before range, Category, Project, expansion, legend, and record-count processing. Empty targeted schedules render their requested date cells and an explicit empty-state message.

Rendering is browser-aware. Chromium and WebKit use the existing `html-to-image` publication path. Firefox targeted exports use a deterministic Canvas 2D renderer that draws the staged publication's measured geometry and semantic content directly, avoiding the DOM-rasterization failures observed with `html-to-image` and `html2canvas` in Firefox CI. Current Grid annual export behavior remains unchanged.

Final automated qualification on head `2dccd1bf57e18bc02842e39c8e85faaf33735d26` passed: 131/131 unit/integration tests, typecheck, production build, Chromium smoke 8/8, Chromium v0.5.23 12/12, Chromium v0.5.24 6/6, Chromium v0.5.25 11/11 including a real downloaded PNG and narrow-preview interaction, plus full Firefox and WebKit Playwright suites. Vercel also succeeded. The v0.5.25 targeted suite has retries disabled.

Manual physical-device acceptance remains sensible after merge for iPhone Safari native Share / long-press Save Image, rotation/safe-area behavior, and a representative December-to-January Custom export. AI interchange remains 4 and backup schema remains 7; there is no migration.
