# Entity ordering contract — v0.5.22

Categories retain persisted array order. People and Project Tags use existing `order` fields, normalized deterministically with stored array position as the fallback for legacy missing/invalid values. Up/Down uses the shared immutable `moveOrderedEntity` helper: it moves the selected record and immediately assigns contiguous order values, rather than re-sorting by stale pre-move values. This fixes both the stale-order normalization defect and the Project search/filter index mismatch.

Controls update immediately through the active-calendar mutation store, disable boundaries, stop accidental parent interaction, and expose accessible labels. People and Project Tags therefore survive Settings close, refresh, backup/export, and restore without a schema bump. Selectors consume normalized context arrays or `sortProjectTags`; Categories retain their existing array mechanism.
