# LifeGrid v0.4.9 — Calendar Isolation and Interchange Refinement

**Objective:** isolate calendar versions, improve the grid header and exports, and harden the model-agnostic external-information starter prompt. The canonical application version is `artifacts/lifegrid/src/lib/version.ts`; Universal AI Interchange remains v3.

## Changes
- The calendar title has responsive header room, an adjacent caret and native title tooltip; LifeGrid v0.4.9 is independently centered. The redundant visible Today cell badge was removed while the visual ring/accent and accessible label remain.
- **Empty** creates only the Other fallback category and no records, people, projects, or custom tags. **Copy Structure** deep-copies categories, people, and projects only. Existing duplicate remains a deep complete copy. Sample remains fictional.
- A confirmation-protected **Reset to Truly Empty** is available only where events, tasks, and people schedules are empty; it clears people/projects/custom categories only in the active calendar.
- Shared filenames: `lifegrid_json_backup_<calendar>_<date>_<time>.json`, `lifegrid_ics_export_<calendar>_<date>_<time>.ics`, and `lifegrid_text_export_<calendar>_<date>_<time>.txt`.
- The starter prompt now uses staged source inventory, access limits, evidence extraction, temporal normalization, entity/source conflict policies, field reference, planning policy, and deterministic validation. It contains no current calendar records.

## Compatibility and limitations
Backups retain the prior filename convention and JSON compatibility. ICS content and UID behavior are unchanged. v3 has no deletion/merge, timezone, end-date, time-status, or DST model; timezone persistence is intentionally deferred.

**Branch:** `codex/implement-v0.4.9-calendar-isolation-interchange-refinement`  
**Commit / PR:** recorded after release commit.  
**Deployment:** not verified by this patch.
