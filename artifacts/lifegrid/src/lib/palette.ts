export const CORE_COLOR_PALETTE = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#6b7280', '#0891b2', '#db2777',
  '#65a30d', '#4f46e5', '#ea580c', '#0d9488', '#be123c', '#0369a1', '#854d0e', '#475569',
] as const;
export const normalizedPaletteIsUnique = (colors: readonly string[] = CORE_COLOR_PALETTE) =>
  new Set(colors.map(color => color.trim().toLowerCase())).size === colors.length;
export const paletteWithCurrentColor = (current?: string | null) => current && !CORE_COLOR_PALETTE.some(color => color.toLowerCase() === current.toLowerCase()) ? [current, ...CORE_COLOR_PALETTE] : [...CORE_COLOR_PALETTE];
