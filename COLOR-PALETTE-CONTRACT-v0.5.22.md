# Color palette contract — v0.5.22

One shared 16-value core palette is exported by `palette.ts`, contains no duplicate normalized hex values, and uses 16 documented perceptual families: crimson, tangerine, gold, chartreuse, forest, emerald, teal, cyan, azure, cobalt, indigo, violet, magenta, rose, umber, and slate. The hue progression deliberately avoids the prior repeated gray/purple/orange clusters while retaining dark-enough swatches for light surfaces and saturated swatches for dark appearance.

Settings entity editors and Event manual selection use this shared palette. Existing arbitrary values are prepended as the current choice and are never replaced automatically. Creation chooses an existing core default; manual selection updates only the edited entity through existing mutation paths. Backup/restore remains a literal color-value round trip, and this release performs no bulk recoloring.
