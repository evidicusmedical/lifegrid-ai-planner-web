# Bundle analysis — v0.5.7

A fresh production build is the source of truth for generated sizes (record its output in HANDOFF). The prior documented baseline was 712.35 kB JS / 214.82 kB gzip JS and 126.11 kB CSS / 20.37 kB gzip CSS, with a 823.59 KiB precache.

v0.5.7 changes the Grid synchronous dependency path by replacing the top-level `html-to-image` import with `import('html-to-image')` inside image export. Vite emits it as a lazy chunk; PWA Workbox globbing includes emitted JS chunks in the precache, preserving the installed offline contract after a successful updated build. No claim is made here about reduction until the build output is captured. AI, backup, and Settings boundaries were inspected but not split speculatively.
