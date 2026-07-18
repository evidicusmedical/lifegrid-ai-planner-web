# LifeGrid v0.4.18 — Mobile Workflow and PWA Completion

## Objective
Complete practical narrow-screen navigation and workflow polish without changing LifeGrid data semantics.

## Delivered
- **Mobile navigation:** labelled six-route bottom navigation (Grid, Tasks, Projects, People, AI, Settings), 44px minimum controls, safe-area padding, active state, and hash/history Back handling.
- **Grid and Day Detail:** the annual grid retains its own horizontal scrolling; Day Detail uses dynamic viewport sizing, touch-sized records, wrapping temporal details, and full notes.
- **Editors and keyboard:** Event, Task, and Person Schedule sheets use an internal scroll area and 92dvh/safe-area mobile sheet contract, retaining unsaved values on keyboard dismissal.
- **Tasks, Projects, People:** existing responsive task and people workflows remain; the new Projects route provides wrapping cards, progress, and touch-safe persisted reorder controls.
- **AI, backups, ICS, image export:** existing local export/import controls were audited; their no-network implementation remains available offline. Long code blocks already own horizontal scrolling.
- **Time Data Review:** standard analyzer review only; Refresh Review and post-save reanalysis remain. No Rapid Review is restored.
- **PWA/offline:** Vite PWA manifest has standalone display, start URL/scope, colours, and local icons; precaching continues to provide the previously loaded shell. Auto-update behaviour remains the plugin default.
- **Storage resilience:** failed persistence now displays an actionable error, does not report success, and does not clear stored data.

## Accessibility and performance
Visible navigation labels, aria current route, labelled controls, touch-sized actions, safe-area padding, truncation/wrapping, and `min-width: 0` protect narrow layouts. The header retains its single minute timer; this patch does not add timers/listeners or render hidden technical content.

## Verification status
Node source-contract tests and typechecks/builds are recorded in the release handoff. No browser runner is installed; device, installed-PWA, offline, and production verification were not performed.

## Version sources and compatibility
Canonical version: `artifacts/lifegrid/src/lib/version.ts` (`v0.4.18`). Package: `artifacts/lifegrid/package.json` (`0.4.18`). Universal AI interchange remains v4; backup schema remains v6. Existing schema-6 backups remain compatible.

## Limitations and next release
This is not browser/device certification. Test safe update behaviour, keyboard/visual viewport interaction, installation, and offline launch on real iOS/Android before release. A next patch can address findings from that acceptance run.

Branch: `codex/implement-v0.4.18-mobile-workflow-pwa-completion`. Commit and PR URL are filled after release creation. Deployment status: not production-verified.
