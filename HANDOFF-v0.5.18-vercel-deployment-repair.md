# LifeGrid v0.5.18 Vercel deployment repair handoff

## Starting state and scope

- Starting main-equivalent commit: `bf6375e02b1e1f9c5f6c880c8853bc7098e7923f` (`Merge pull request #40 from evidicusmedical/codex/fix-lifegrid-ai-import-reliability-issues`).
- PR #40 is merged and its merge commit is the current checked-out main-equivalent commit. Its first parent is `d7a2edf1f87db66bf36f3280a2c02e2a2def6b08`, so the checkout contains the merge rather than a stale PR branch.
- Latest merged PR confirmed from local Git history: PR #40 (`codex/fix-lifegrid-ai-import-reliability-issues`). The GitHub CLI is not installed and unauthenticated GitHub API access returned HTTP 403 in this environment, so the GitHub dashboard/API could not independently provide a newer remote PR list.
- Working branch: `work`. Implementation commit: `d8e4c0b9ff67800e36a046ad06a95205c7157f19` (`fix: repair LifeGrid Vercel deployment`). Pull-request number and URL are supplied after PR creation.

This repair deliberately does not change the v0.5.18 AI-import reliability implementation.

## Root cause and repair

Vercel's `ERR_PNPM_OUTDATED_LOCKFILE` was caused by the LifeGrid manifest declaring `@playwright/test` `1.55.0` while the committed workspace importer did not contain it. The regenerated `pnpm-lock.yaml` now records the importer, package resolution, snapshot, and transitive `playwright`/`playwright-core` `1.55.0` entries. Playwright was retained.

The repository is pinned to Corepack-managed `pnpm@10.28.1` in the root `packageManager` field; that exact version generated and successfully verified the lockfile. No install override disables frozen-lockfile behavior.

`vercel.json` now makes the intended monorepo target explicit:

- Root Directory: repository root, so the root lockfile and `vercel.json` headers are used.
- Install: Vercel's normal pnpm install with its default frozen-lockfile behavior.
- Build Command: `pnpm --filter @workspace/lifegrid build`.
- Output Directory: `artifacts/lifegrid/dist/public`.

This avoids the root workspace's broad build command (which also builds the unrelated mockup sandbox and needs its own `PORT` and `BASE_PATH` variables) and deterministically deploys the LifeGrid Vite output.

## Release identity audit

The active values are aligned:

- `APP_VERSION`: `v0.5.18`
- LifeGrid package version: `0.5.18`
- `public/version.json`: `appVersion` `v0.5.18`, `aiInterchangeVersion` `4`, `backupSchemaVersion` `7`
- `index.html` `lifegrid-app-version`: `v0.5.18`
- `AI_INTERCHANGE_VERSION`: `4`
- `BACKUP_SCHEMA_VERSION`: `7`

The generated LifeGrid output contains `v0.5.18`, `Universal AI Interchange v4`, and `version.json` with backup schema `7`. Active runtime/deployment files contain no `v0.5.16` release identity; remaining v0.5.16 references are historical release documentation and intentionally retained. The retirement workers remain static, have no fetch handler, and are not reactivated.

The repository cannot inspect the authenticated Vercel deployment history from this environment. Based on Vercel reporting a failed newer deployment and production showing `v0.5.16`, the most likely explanation is that Vercel continued serving its last successful deployment. This patch proves the source and generated output are v0.5.18, but the dashboard must confirm which deployment was last successful after redeploying.

## Commands and actual results

- `node --version` → `v24.15.0`
- `corepack enable && corepack prepare pnpm@10.28.1 --activate && pnpm --version` → `10.28.1`
- `pnpm install` → passed; lockfile was up to date.
- `pnpm install --frozen-lockfile` → passed.
- `pnpm --filter @workspace/lifegrid typecheck` → passed.
- `pnpm typecheck` → passed.
- `pnpm --filter @workspace/lifegrid test` → passed: 65 tests, 65 passed, 0 failed.
- `pnpm --filter @workspace/lifegrid build` → passed.
- `pnpm build` → expected failure without the unrelated mockup sandbox's required `PORT`.
- `PORT=3000 pnpm build` → expected failure without the unrelated mockup sandbox's required `BASE_PATH`.
- `PORT=3000 BASE_PATH=/ pnpm build` → passed.
- `git diff --check` → passed.

## Remaining deployment action

Push the implementation commit and deploy it from the current main branch. Confirm Vercel uses the root-directory/build/output settings above (the committed `vercel.json` provides them), then redeploy. If the dashboard offers it, redeploy once with **Use existing Build Cache** disabled to rule out stale build artifacts. Verify `/version.json`, the `lifegrid-app-version` meta tag, and the rendered header report `v0.5.18`.
