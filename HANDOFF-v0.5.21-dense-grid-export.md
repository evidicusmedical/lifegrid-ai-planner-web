# LifeGrid v0.5.21 handoff

- **Starting main:** `c838f98` (PR #44 merged); implementation branch: `codex/lifegrid-v0.5.21-dense-grid-export`.
- **Root causes:** Grid focus was a visual opacity state applied after cell ordering; annual export captured the interactive table and read unfiltered grid data; month progression chained animation frames; presets always used today; range filtering compared only event start; capture used unconstrained scroll dimensions.
- **Resolution:** Grid categories now filter before sorting/slicing/overflow. Export categories remain isolated and feed the export table model only while exporting. The range uses `detailDate` (the Grid day clicked into detail) when present, otherwise today. Local-date overlap includes overnight and spanning records. Month admission seeds anchor ±1, observes horizontal approach, then uses idle/rAF/timer progression.
- **Guardrails:** mobile 8,192px edge / 24MP; desktop 12,000px edge / 52MP. These are LifeGrid reliability guardrails, not universal browser maximums. Unsafe work is blocked with manual recovery actions; no automatic retry occurs.
- **Verification:** install, typecheck, 75 unit/contract tests, build, and `git diff --check` passed. No Playwright browser run was available in this implementation environment; real iPhone Safari still requires release-device verification.
- **Release:** APP_VERSION/package/index/version manifest are v0.5.21. AI interchange remains 4 and backup schema remains 7.
