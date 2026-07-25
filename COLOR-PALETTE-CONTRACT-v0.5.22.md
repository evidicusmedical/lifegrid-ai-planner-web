# Color palette contract — v0.5.22

One shared 16-value core palette is exported by `palette.ts`, contains no duplicate normalized hex values, and is used by Settings entity editors and Event manual selection. Existing arbitrary values are prepended as the current choice and are never replaced automatically. Creation chooses an existing core default; manual selection updates only the edited entity through existing mutation paths. Backup/restore remains a literal color-value round trip. Existing category-color synchronization behavior is preserved; this release performs no bulk recoloring.
