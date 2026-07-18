# Handoff — v0.5.8

Starting main-equivalent commit: `2e62ea2`; merged PR #23 is present and includes expected head `8bc5c5e`. Baseline was v0.5.7/package 0.5.7, AI interchange 4, backup schema 6. Prior backup download was `lifegrid-backup-<lowercased-name>.json`, while Settings ICS already used a shared but UTC-date/local-time-mixed `ics_export` naming helper.

Final shared helper is `artifacts/lifegrid/src/lib/exportFilenames.ts`. It drives JSON backup (complete/all-calendar store, active calendar context in name) and Settings ICS. Timestamp uses calendar display timezone; invalid/unavailable zones use UTC. Sanitization produces safe max-80 readable slugs with `Calendar` fallback. Callers may request deterministic same-second `_2` suffixes.

Mobile changes: scrollable chip rails, mobile sort row, min-width-safe card title/metadata, safe-area-aware FAB/list/nav and structured header. Browser installation failed with `ERR_PNPM_FETCH_403` for pinned Playwright, therefore timings are not reported; manual Grid trace instructions are in `GRID-BROWSER-RESULTS-v0.5.8.md`.

Branch: `codex/implement-v0.5.8-browser-mobile-export-naming`. Run package tests, benchmarks, typechecks, builds, and `git diff --check`; PR URL and deployment status are filled after commit/PR creation. Recommended v0.5.9: run the configured browser matrix once package registry access is restored.
