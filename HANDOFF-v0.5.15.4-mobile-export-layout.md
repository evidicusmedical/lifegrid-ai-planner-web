# Handoff — v0.5.15.4 mobile image export layout

Starting main-equivalent commit was `bac245a` (merged PR #35), which contains expected preceding head `bd32e20ce67cbe37f1a87d21251338f7cd996d56`. Baseline identity was APP_VERSION `v0.5.15.3`, package `0.5.15-3`, AI interchange 4, and backup schema 7. Service-worker retirement files remain in `artifacts/lifegrid/public`.

The preceding inline panel used `max-h-[calc(100dvh-10rem)]`; header quality controls were hidden below `sm` and content mode below `md`. v0.5.15.4 selects the sheet below 640px, or at 600px height with a coarse pointer. The sheet is `100vh`/`100dvh`, its body owns vertical scroll, and its footer uses `safe-area-inset-bottom`. The original inline panel remains at desktop/tablet dimensions. No export filtering, capture dimensions, or generation flow changed.

Automated viewport/browser emulation and physical iPhone Safari validation were not available in this environment; perform the listed acceptance procedure before release.
