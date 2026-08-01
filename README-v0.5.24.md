# LifeGrid v0.5.24 hotfix

v0.5.23 passed the complete React context object into complete AI export. The all-data selector then called `structuredClone` on functions, raising `DataCloneError` before clipboard or download delivery. Restricted ranges could appear healthy because they cloned individual collection records.

v0.5.24 passes only the active calendar `AppData`, defensively selects/clones the seven canonical collections, builds fresh text for every delivery action, falls back to an off-screen textarea for copy, and downloads UTF-8 text with an attached anchor and delayed object-URL cleanup. Generated text is kept only in component Preview state and is never persisted.
