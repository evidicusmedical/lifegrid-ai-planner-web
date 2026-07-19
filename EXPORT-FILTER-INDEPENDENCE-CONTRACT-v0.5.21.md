# LifeGrid v0.5.21 — Dense Grid and Export

## Contract
Grid category chips filter the interactive annual grid **before** sorting, the five-pill visible limit, and overflow calculation. Unselected legend chips are dimmed only as a legend affordance; unrelated event pills are absent. Export categories are a separate, session-only state and never copy or mutate Grid selections.

Export ranges use the selected Grid  as the Next 7/14/30 anchor, otherwise today. Stored local date intervals overlap when  and ; overnight and spanning events therefore remain included without timezone conversion.

Month rendering admits anchor and adjacent months immediately, admits scroll-near months, then uses idle callbacks with rAF/timer fallback. Admission persists per calendar/year session and export never changes it.

Image capture renders only the export-filtered model while exporting. A reliability guardrail estimates dimensions/area before capture (mobile: 8,192px edge / 24MP; desktop: 12,000px edge / 52MP). These are conservative LifeGrid guardrails, not universal browser maximums. Unsafe jobs explain recovery: Visible, fewer categories, shorter range, or Fast. No automatic retry occurs; failed capture restores temporary styles.
