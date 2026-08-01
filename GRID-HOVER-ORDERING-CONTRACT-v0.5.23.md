# Grid hover and ordering contract

On hover-capable layouts, every visible Event opens one reusable preview after 125 ms. It remains interactive/selectable, bounds itself to the viewport, scrolls long user notes, scopes Ctrl/Cmd+A to itself, and closes on Escape or delayed pointer exit. It excludes AI/source notes. Grid clicks always open complete Day Detail; editor navigation begins there.

Daily ordering is timed (including legacy approximate) before all-day (including legacy unknown), then display priority, timed start, configured Category order, title, and stable ID. Inclusive `date`/`endDate` ranges expand only in the view model.
