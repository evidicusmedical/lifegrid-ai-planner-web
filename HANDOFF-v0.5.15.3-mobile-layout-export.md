# Handoff — v0.5.15.3

## Starting state

`main` was at `7c1193f` (PR #34 merge), with preceding implementation commit `87b6570`. The starting release was v0.5.15.2 / package `0.5.15-2`, AI interchange 4 and backup schema 7. Retirement workers remain in `artifacts/lifegrid/public/sw.js` and `service-worker.js` without fetch handlers.

## Responsive audit findings and repair

* The Grid export toolbar hid mode/quality controls at `sm`/`md`, then crowded a single non-wrapping header row. Its duplicated options triggers made the actual workflow hard to discover on a phone.
* Export options were inline but lacked a viewport-bounded scroll region; long summaries and controls could compete with the Grid for height.
* The annual table intentionally has a fixed 1,352px minimum width. The repair explicitly confines it to `grid-content`; it does not make the document a horizontal scroller.
* Existing shared mobile foundation already bounded sheets, safe areas, inputs, header truncation, bottom navigation, and technical-string wrapping. This release extends the same guards to Grid/export popovers and controls.

## Remaining manual validation

Automated static/unit, type, benchmark and build checks are recorded in acceptance. No iPhone Safari/Home Screen device is available in this environment; validate native Share sheet and press-and-hold save behavior there.
