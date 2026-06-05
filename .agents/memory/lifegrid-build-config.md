---
name: LifeGrid build & export gotchas
description: Non-obvious build env requirements and the PNG-export library choice for the LifeGrid artifact
---

# LifeGrid build & export gotchas

## Production build requires env vars
`vite build` for `artifacts/lifegrid` fails at config-load time unless `PORT` AND `BASE_PATH` are set (vite.config.ts throws if either is missing). To verify a build locally: `PORT=3000 BASE_PATH=/ npx vite build`.
**Why:** the vite config hard-requires them so dev/preview routing works behind the Replit path-based proxy; they aren't only a dev concern.
**How to apply:** any time you want to sanity-check the build outside the workflow, supply both vars. The sourcemap "Can't resolve original location" lines from shadcn ui files are benign.

## PNG export uses html-to-image, NOT html2canvas
The Grid "Export" button renders to PNG with `html-to-image`. html2canvas was the original (broken) choice — it cannot parse modern CSS color syntax `hsl(h s l / a)` (space-separated + slash alpha) used by the Tailwind/shadcn theme tokens, so exports came out blank/wrong.
**Why:** shadcn theme variables emit the modern space/slash hsl form; html2canvas only understands the legacy comma form.
**How to apply:** keep using html-to-image; do not "simplify" back to html2canvas without first converting all theme colors to the legacy form.
