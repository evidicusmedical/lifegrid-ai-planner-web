# Mobile Grid export contract — v0.5.15.3

* The compact, one-table January–December Grid remains unchanged and scrolls horizontally only inside `grid-content`.
* `button-export` is visible at every viewport size, keyboard/touch operable, and opens export options rather than relying on hidden desktop controls or hover.
* The options panel is vertically scrollable and contains density, title, subtitle, generated timestamp, date range, category and project filters, plus generation.
* Image dimensions remain publication dimensions, independent of the phone viewport.
* Generation announces status, always resets its loading state, provides clear failure feedback, offers File-sharing only when supported, and retains download/long-press save fallback.
* Export-specific record/legend/targeted-week preparation is deferred until the export UI is active.
