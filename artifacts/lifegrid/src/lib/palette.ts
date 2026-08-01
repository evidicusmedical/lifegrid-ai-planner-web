export const CORE_COLOR_PALETTE = [
  '#be123c', '#c2410c', '#a16207', '#4d7c0f', '#15803d', '#047857', '#0f766e', '#0e7490',
  '#0369a1', '#1d4ed8', '#4338ca', '#7e22ce', '#a21caf', '#be185d', '#78350f', '#475569',
  '#991b1b', '#ea580c', '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488', '#0891b2',
  '#0284c7', '#2563eb', '#4f46e5', '#9333ea', '#c026d3', '#db2777', '#92400e', '#64748b',
] as const;
export const CORE_COLOR_FAMILIES = [
  'crimson', 'tangerine', 'gold', 'chartreuse', 'forest', 'emerald', 'teal', 'cyan',
  'azure', 'cobalt', 'indigo', 'violet', 'magenta', 'rose', 'umber', 'slate',
  'ruby', 'orange', 'sunflower', 'lime', 'green', 'mint', 'turquoise', 'sky',
  'blue', 'royal', 'iris', 'purple', 'fuchsia', 'pink', 'ochre', 'steel',
] as const;
export const normalizedPaletteIsUnique = (colors: readonly string[] = CORE_COLOR_PALETTE) =>
  new Set(colors.map(color => color.trim().toLowerCase())).size === colors.length;
export const paletteFamiliesAreDistinct = () => new Set(CORE_COLOR_FAMILIES).size === CORE_COLOR_PALETTE.length;
export const paletteWithCurrentColor = (current?: string | null) => current && !CORE_COLOR_PALETTE.some(color => color.toLowerCase() === current.toLowerCase()) ? [current, ...CORE_COLOR_PALETTE] : [...CORE_COLOR_PALETTE];
