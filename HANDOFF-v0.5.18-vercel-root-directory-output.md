# LifeGrid Vercel root-directory output handoff

## Baseline and recent history

- Current `main` baseline: `aa6ca3dfaa68ed3c131eccc4d90ea4b145e781e0` (merged PR #41).
- Recent merged PRs: #41, **Vercel deployment repair and pnpm lockfile synchronization**; #40, **LifeGrid v0.5.18 AI-import reliability fixes**.
- This change is deliberately deployment configuration only: it does not alter LifeGrid runtime behavior, schema versions, AI imports, service-worker retirement, or Vite output.

## Root cause

LifeGrid's Vite configuration emits its static site at `dist/public` relative to the LifeGrid package (`artifacts/lifegrid/dist/public` at repository root). The failed deployment's `No Output Directory named "public"` message therefore indicates that the active Vercel project setting is still overriding/using `public` as its output directory after a successful build. `public` is Vite's source-static-assets directory, not its build output directory.

The deployment log also implies that the Vercel **Root Directory** is `artifacts/lifegrid`: it reports the build output as `artifacts/lifegrid/dist/public`, while Vercel subsequently searches for `public` relative to that root.

## Configuration committed here

Vercel resolves `vercel.json` from the configured project root. This repository now commits a configuration for each supported root-directory mode:

| Vercel Root Directory | Config file | Install Command | Build Command | Output Directory | Absolute repository output |
| --- | --- | --- | --- | --- | --- |
| repository root | `vercel.json` | `pnpm install` | `pnpm --filter @workspace/lifegrid build` | `artifacts/lifegrid/dist/public` | `artifacts/lifegrid/dist/public` |
| `artifacts/lifegrid` | `artifacts/lifegrid/vercel.json` | `pnpm install` | `pnpm build` | `dist/public` | `artifacts/lifegrid/dist/public` |

The LifeGrid-root configuration retains the existing cache-control and content-type headers, including headers for the retirement-only worker files. It does **not** register or reactivate a service worker. Running `pnpm install` from the LifeGrid directory continues to discover `pnpm-workspace.yaml` in the parent repository and resolve workspace dependencies from the monorepo lockfile.

## Dashboard override and one remaining phone action

A committed `vercel.json` supplies the correct defaults for a project rooted at `artifacts/lifegrid`. However, a non-default Output Directory explicitly saved in the Vercel dashboard is a project-level override and is not safely removable from Git. The log proves the existing project is currently using `public`; repository changes cannot edit that dashboard setting.

**One phone-friendly action is required if the Vercel project still displays `public`:** Vercel Dashboard → LifeGrid project → **Settings** → **General** → **Build & Development Settings** → **Output Directory** → replace `public` with `dist/public` → **Save**, then redeploy the latest commit.

No dashboard change is needed for a new project or a project without that explicit override: the app-local `artifacts/lifegrid/vercel.json` is honored when Root Directory is `artifacts/lifegrid` and supplies `dist/public`.

## Verification

The required frozen install, LifeGrid typecheck, unit tests, and production builds were run. Both root-mode build commands create `artifacts/lifegrid/dist/public`; its `index.html` and `version.json` exist. The built `version.json`, generated assets, HTML metadata, package, and `APP_VERSION` identify this release as **v0.5.18**. Compatibility constants remain `AI_INTERCHANGE_VERSION = 4` and `BACKUP_SCHEMA_VERSION = 7`.

- Branch: `codex/fix-lifegrid-root-vercel-output`
- Commit: recorded with this handoff.
- PR: created after this commit; see the pull request for its number and URL.
