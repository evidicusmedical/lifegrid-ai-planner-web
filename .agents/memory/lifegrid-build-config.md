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

## iPhone Safari export must NOT rely on `<a download>`
This app is iPhone-Safari-first. iOS Safari ignores the `download` attribute for data-URLs, so a programmatic `a.click()` download silently does nothing — the user sees "no output." Also html-to-image often renders a blank/partial PNG on the FIRST pass in Safari.
**Why:** observed real user report ("export isn't outputting anything to view").
**How to apply:** render the PNG, then (1) call `toPng` ~3x on Safari to warm it up, (2) try `navigator.share({files:[File]})` first for the native save/share sheet, (3) fall back to an in-app full-screen `<img>` preview overlay (long-press to save) + a download button. Same pattern applies to any future file export here.

## iPhone Safari wipes React state on app-switch — persist in-progress flows
When the user leaves Safari to paste a prompt into ChatGPT/Claude and returns, iOS reloads the backgrounded tab, resetting all in-memory React state. Symptom reported as "can't input text into the AI section" — the paste field had been gated behind generating a prompt in the same session, so it was gone on return.
**Why:** real user blocker on the AI export/import exchange.
**How to apply:** persist any multi-step "leave-the-app-then-come-back" flow to localStorage (rehydrate on mount via `useRef(loadDraft()).current`, sync via effect, add a savedAt TTL e.g. 72h, skip persisting empty/default state). Never gate the return/paste step behind earlier in-session state — keep the input always rendered.
