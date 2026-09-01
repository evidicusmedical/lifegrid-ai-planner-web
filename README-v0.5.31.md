# LifeGrid v0.5.31 — Natural publication wrapping

This focused publication patch makes Category legend entries use intrinsic, non-shrinking widths so ordinary labels move as units before words break. Multi-word labels wrap at spaces; only a token wider than the capped label width may break internally.

Targeted Event titles now use normal word boundaries with hyphenation disabled while retaining the existing font, line height, line count, and card geometry. Canvas2D uses the shared metric-driven wrapper, including bounded final-line orphan balancing and final-line ellipsis for genuine overflow.

The month-matrix table is content-bound rather than flex-stretched. Its weekday header remains compact, dated rows follow immediately, and unused Letter-frame space remains below the table.

Renderer selection, storage schema 7, and AI interchange version 5 are unchanged. Export latency is intentionally deferred until a repeatable regression is measured.
