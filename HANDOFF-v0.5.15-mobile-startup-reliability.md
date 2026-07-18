# Handoff — v0.5.15 Mobile Safari and Home Screen Startup Reliability

## Baseline and audit

PR #30 is merged in the starting checkout as `b5f7058`; preceding head `16d05b6c44d0a9070687998fe8bf7f931fd6d05e` is present. Baseline APP/package were v0.5.14/0.5.14, AI interchange 4, backup schema 7. The initial app was a partial PWA: VitePWA generated a manifest and auto-update Workbox worker, with `globPatterns` including HTML. That configuration structurally allowed stale cached HTML to reference deployment-removed Vite chunks—the primary white-screen hypothesis. It was not reproduced on a real device. Existing routing was hash based and `/` defaulted to Grid; unknown hashes already fell back to Grid, while legacy projects routes redirect to Tasks. There was no root error boundary or pre-React shell. Theme localStorage reads were unguarded. Existing safe-area CSS was present. No root Vercel configuration was found.

## Release implementation

A public root manifest and existing purpose-built PNG icons provide the audited launch contract. VitePWA is disabled and startup unregisters old workers, prioritizing online reliability over offline shell support. Vercel no-store HTML and immutable assets headers prevent stale entry HTML. The startup shell, global diagnostics, root boundary, retry/reload/cache-only recovery, one-shot chunk recovery, and guarded theme storage prevent an empty document. Cache reset never accesses LifeGrid calendar storage. AppData normalization remains clone-like parse/normalize before persistence; schema stays 7 and migration failures surface through the boundary rather than an uncaught white screen.

## Verification and status

Node test/build/typecheck/benchmarks are recorded in the final implementation report. No browser runner was installed or added because the existing dependency set lacks Playwright; WebKit/mobile Chromium/standalone/real iPhone were not run. Branch: `codex/implement-v0.5.15-mobile-startup-reliability`. Commit and PR URL are filled after commit creation. Deployment status: not deployed from this environment.

Final commit: `6ac12ccfb22d5e429ff5cd01de3b5ef979556358`. PR metadata was submitted with title “Repair mobile Safari and Home Screen startup reliability”; the local PR tool did not return a hosted URL.
