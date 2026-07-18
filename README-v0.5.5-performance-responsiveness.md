# LifeGrid v0.5.5 — Performance and responsiveness

## Objective and result
This release investigates slow Grid, Tasks, and Settings navigation with deterministic fictional scale data rather than speculative changes. It adds a repeatable Node benchmark (`pnpm --filter @workspace/lifegrid benchmark`), date/task/project indexes, deferred Flagged Items analysis, and redundant-write avoidance. It retains AI interchange v4 and backup schema 6.

## Findings and changes
Grid now builds a displayed-date event index once for a data/timezone change, so annual cells use map lookup rather than collection scanning. Tasks have reusable ID, parent-child, and linked-event index helpers. Project Tag usage uses a one-pass index. Settings mounts its shell without temporal review work; review analysis runs on opening/refresh and is invalidated on calendar changes. Storage still writes synchronously after a changed store update, but skips byte-identical serialized states. Image export remains a known initial-bundle candidate; it was not changed because this patch did not establish a safe offline lazy boundary.

## Measurement
The benchmark generates stable fictional small (100/50/10/10/1), medium (1,000/500/100/30/3), and large (5,000/2,000/500/100/5) Event/Task/Person Schedule/Tag/Calendar fixtures. Results are Node pure-operation medians, not browser navigation times. See PERFORMANCE-BASELINE-v0.5.5.md.

## Limits and next release
Large full-store serialization remains the dominant measured operation. v0.5.6 should profile browser commits with an installed browser runner, consider an offline-safe export split, and assess persistence batching only with durability tests.

Branch: `codex/implement-v0.5.5-performance-responsiveness`. Commit and PR URL are filled after release creation. Deployment was not verified.
