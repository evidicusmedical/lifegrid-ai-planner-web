# LifeGrid v0.5.24 handoff

- Repository: `evidicusmedical/lifegrid-ai-planner-web`
- Base: `main`
- Starting main SHA: `e393a8ee65c742ebe62b300b302978a4a1952961`
- Branch: `codex/hotfix-ai-export-delivery-v0.5.24`
- Correction/final SHA: recorded in the PR and final delivery response
- PR: recorded after creation
- Unit/integration: 114 passed
- Typecheck/build: passed
- Chromium/Firefox/WebKit: local execution blocked by HTTP 403 while downloading Playwright browsers; required CI checks pending
- GitHub Actions/Vercel: pending PR creation

## Incident and correction
Copy and Download failed because complete export cloned the function-bearing application context. Restricted export differed because it cloned selected collections. The hotfix enforces the active-calendar AppData boundary, explicit canonical cloning, fresh package delivery, clipboard fallback, delayed download cleanup, persistent safe status, and Preview retention on delivery failure.

## Remaining release checks
Complete the desktop and mobile checklist in `ACCEPTANCE-v0.5.24.md`, confirm GitHub Actions and Vercel, and do not merge until all Chromium, Firefox, and WebKit jobs are green.
