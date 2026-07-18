# Mobile Export Layout Contract — v0.5.15.4

1. Exactly one export form is rendered while options are open: inline at desktop/tablet dimensions, or modal sheet in compact mode.
2. Compact mode applies below 640px, or at max-height 600px for coarse pointers; it uses a scrim, modal semantics, 100dvh fallback, focus return, and document scroll lock.
3. The dialog header is always visible; its body is the single form scroll owner; the safe-area-aware footer keeps Generate reachable.
4. Mobile controls use the existing `exportMode`, `exportPixelRatio`, filters, output fields, and `handleExport` handler; no alternate export state or defaults exist.
5. Closing leaves Grid year, scroll position, category focus, and export values untouched. Lazy export derivations remain gated by open/generating/preview state.
6. Generated preview retains bounded image width, share/download fallbacks, and iPhone long-press guidance. Desktop retains inline presentation and header mode/quality controls.
