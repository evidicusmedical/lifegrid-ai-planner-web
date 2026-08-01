# Grid hover and ordering contract

GridView owns one 125 ms open timer and one 180 ms close timer. Source/preview pointer or focus entry cancels close; leaving schedules close; Escape and a different Event cancel timers; unmount cleans both. Touch/coarse-pointer hover is not activated. Preview text remains selectable, scrollable, and Ctrl/Cmd+A scoped.

Every daily surface uses timed (including approximate) before all-day (including unknown), then display priority, timed start, Category order, title, and stable ID. Inclusive multi-day expansion retains the original Event ID and storage record.

Annual and targeted image layouts consume the same expanded export bucket map, including when a range clips either end of a multi-day Event. Export dismissal is document-controlled in both layouts: button/panel interaction is ignored, outside pointer and Escape close, and active generation prevents closure. Preview timers are also cleared on calendar/year changes and editor/Day Detail opening.

Qualification uses a test-local fine-pointer `matchMedia` shim only for desktop hover assertions; production hover gating is unchanged. Keyboard focus remains an independent preview entry path. Targeted export exposes its real expanded bucket DOM while Export options are open so deterministic browser tests can assert second/third-day source IDs without depending on PNG rasterization.
