# v0.5.10 private-backup acceptance

1. Preserve JSON backup; open a v0.5.10 bundle (App Header), hard refresh, and record whether `navigator.serviceWorker.controller` is present.
2. Restore privately without capturing content. Start Tasks, open console, navigate Grid, and record tab, shell, first month, interaction, adjacent months, full completion.
3. Run `window.lifegridGridTiming()` and `window.lifegridGridDomStats()` after shell, first month, and completion; record counts/times only.
4. Repeat Settings→Grid and warm navigation; test 390×844 and 430×932. Open a day and long-note Day Type while staging; change year and return.
5. Request image export before completion; verify all months in image. Export JSON and verify filename/full data. Record browser/device/cache/SW state/errors/visual defects and whether first month was usable. Do not commit private content or traces.
