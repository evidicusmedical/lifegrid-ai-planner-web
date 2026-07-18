# Mobile layout contract — v0.5.15.3

Supported viewports are 320×568, 360×800, 375×667, 390×844, 393×852, and 430×932.

* User-facing responsive containers must be `min-width: 0`/`max-width: 100%` where applicable; technical text uses `wrap-anywhere`.
* Document-level horizontal scrolling is prohibited. The Grid content container is the explicit, bounded annual-table horizontal scroller.
* Header calendar text truncates with its full value in accessible labelling/title. Bottom navigation preserves five touch-sized destinations and safe-area padding.
* Sheets and export options use viewport-bounded height with independent vertical scrolling and safe-area-aware padding.
* Normal explanatory text wraps; warnings and diagnostics are never globally truncated.
