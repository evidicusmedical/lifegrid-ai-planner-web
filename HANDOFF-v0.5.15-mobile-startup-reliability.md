# v0.5.15 handoff

Starting checkout was merge PR #30 `b5f7058`, containing expected preceding head `16d05b6c44d0a9070687998fe8bf7f931fd6d05e`. Baseline was v0.5.14/0.5.14, AI interchange 4, backup schema 7. The checkout branch was `work` (the requested release branch was not present locally).

Audit found a partial PWA: Vite PWA generated a manifest and auto-update Workbox worker, while `index.html` had Apple metadata but no manifest link or startup shell. Hash routing defaulted valid/unknown routes to Grid but listened only to `popstate`. The generated worker precached HTML, a structural stale-index/chunk mismatch risk. There was no root error boundary, unhandled-rejection handler, or guarded theme storage read. No root `vercel.json` existed. Safari-sensitive `crypto.randomUUID` was already guarded in the provider but several user actions still use it; this does not run at startup.

v0.5.15 adds a static root manifest, startup shell, safe area sizing, error boundary/recovery screen, privacy-safe diagnostics, one-time chunk recovery, guarded theme storage, hashchange support, and Vercel cache headers. The generated service worker was deliberately removed; the recovery action unregisters old workers and clears only Cache Storage. The precise reported iOS white screen was not reproduced here; stale worker/index chunk mismatch and uncaught startup storage/render errors are the supported structural causes.

Browser automation and real-device verification were not run. Production deployment/PR URL are pending repository automation. See acceptance steps for real iPhone validation.
