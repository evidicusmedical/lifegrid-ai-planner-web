# Performance investigation
The removed implementation scanned a 36-hour interval minute by minute using `Intl.DateTimeFormat`. Grid projection now reads Event fields directly and performs no `Intl` work.
