# LifeGrid v0.5.25 — reliable targeted Grid images

LifeGrid v0.5.25 hardens portable PNG schedules for Next 7, Next 14, Next 30, and Custom ranges without redesigning Current Grid export. The targeted capture source renders at normal coordinates, independently of annual Grid staging and interactive scrolling. Relative presets start today, short Custom ranges can cross a year boundary, private (`showInExport: false`) Events are consistently excluded, and meaningful empty schedules can be exported.

The release also closes the interaction regressions uncovered during qualification: multi-day Event pills reliably open the exact Day Detail occurrence, hover/focus Preview no longer steals pointer activation, and the image Preview/Download controls remain above persistent mobile navigation at narrow widths.

Targeted PNG rendering is browser-aware. Chromium and WebKit use `html-to-image`; Firefox uses a deterministic Canvas 2D targeted renderer after DOM rasterization proved unreliable in Firefox CI. The exported publication retains the same date range, Category/Project filtering, legend, date cells, Event labels, and empty-state semantics.

Automated qualification is green across the release gate: 131 unit/integration tests, typecheck, production build, Chromium smoke, v0.5.23 regressions, v0.5.24 AI delivery, v0.5.25 real PNG/download coverage, and full Firefox/WebKit Playwright suites. Remaining acceptance is physical-device iPhone Safari Share/long-press, rotation, and safe-area verification. AI interchange version 4 and backup schema version 7 are unchanged.
