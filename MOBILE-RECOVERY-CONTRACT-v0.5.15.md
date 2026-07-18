# Mobile recovery contract v0.5.15

The document contains a dark, non-private LifeGrid startup shell before JavaScript executes. A root React boundary replaces failures with recovery actions. Chunk-load errors may reload once per session after unregistering workers and deleting Cache Storage; subsequent failures remain on the recovery screen. Cache clearing never invokes `localStorage.clear()` and never deletes calendar data. Diagnostics include only environment/startup metadata, never calendar content, dates, titles, tasks, or notes.
