# LifeGrid v0.5.15.4 — Mobile image export layout

This narrow layout release keeps the annual Grid and image-generation semantics intact while presenting Export as a bounded mobile dialog when the viewport is under 640px, or is short with a coarse pointer. Desktop and larger tablets retain the existing inline export panel and header controls.

The mobile dialog has an opaque header, independently scrolling form body, and safe-area-aware sticky action footer. It exposes the shared Visible/Expanded and Fast/Sharp state, all range/filter/output controls, and the existing generated-image preview, share, download, and long-press save guidance. Export work stays lazy: the export model is only active while options, generation, or preview is active.
