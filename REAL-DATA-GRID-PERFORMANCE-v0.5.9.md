# Real-data Grid performance v0.5.9

Baseline: user reported approximately 11 seconds after restoring a private accumulated backup. The private backup was neither read into fixtures nor committed. Root cause was structural: the prior Grid indexed all active Events before it knew the displayed year, passed full Events into cells, and built note-derived title/ARIA/Day Type preview work for every admitted cell. The v0.5.7 single frame yield still created the full annual DOM on its following task.

The benchmark reports selection, compact projection/indexing model work using fictional fixtures. It reports totals, year intersections, summaries and Node runtime; it must not be interpreted as browser rendering time. Browser DOM counts, scripting/layout/paint, long tasks and timings are not available in this environment. Note-only mutations retain equivalent summaries and unchanged month models.
