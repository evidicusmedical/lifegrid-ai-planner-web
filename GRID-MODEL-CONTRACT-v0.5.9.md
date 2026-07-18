# Grid model contract v0.5.9

`GridEventSummary` is immutable and contains only `id`, displayed `date`/`endDate`, `title`, `category`, `color`, `displayPriority`, `timeStatus`, displayed `startTime`/`endTime`, `eventKind`, and `showInGrid`. It excludes notes, AI/source notes, linked tasks, recurring groups, full source references, editor, review, backup and Project Tag data.

Selection is source-range intersection with the displayed calendar year before temporal conversion; valid zoned records receive a one-day conservative boundary margin. Multi-day and year-boundary records are retained. Invalid dates retain legacy non-dropping behavior. Ordering is priority, all-day/timed placement, time, category rank, then title.

The selector signature is display fields only: note/AI/source/task changes do not rebuild a month. Title/date/time/category/color/priority changes do. Per-month signatures retain unaffected month models. Cells receive summaries; Day Detail and EventSheet resolve current full Events by id from context. Exports, backup, ICS and editors keep full stored records.
