# Grid Layout Contract — v0.5.11

## Full-year Grid

Grid is one compact annual table, not a conventional month calendar or vertical feed. The stable annual container contains all twelve month columns and supports horizontal scrolling on narrow screens.

## Fixed slots and order

The canonical `gridModel.months` sequence and the rendered header sequence are January, February, March, April, May, June, July, August, September, October, November, and December. Empty and dense months retain their slots. Filtering, calendar changes, year changes, current-month highlighting, and selected-day highlighting never reorder a slot.

## Rendering and interaction

Rendering priority may improve internal work only; it must never be a layout source. `mountedMonthKeys.map(...)` must not control Grid document order. Current and selected dates are styles/actions within their canonical cells. The compact annual table remains the visual and export composition on desktop and mobile.

## Export and regressions

Annual image/publication export uses the same chronological compact table and includes all twelve months. JSON and ICS are unchanged. Automated contracts assert the stable table, canonical 12-month model, absence of full-width month sections, and the June-before-July condition even when July has highest hypothetical priority.
