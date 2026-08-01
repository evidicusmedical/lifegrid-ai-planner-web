export const CORE_COLOR_PALETTE = [
  '#be123c', '#c2410c', '#a16207', '#4d7c0f', '#15803d', '#047857', '#0f766e', '#0e7490',
  '#0369a1', '#1d4ed8', '#4338ca', '#7e22ce', '#a21caf', '#be185d', '#78350f', '#475569',
  '#1aff1a', '#ffff1a', '#d6d2a9', '#1affff', '#df9fdf', '#1aff9f', '#f2958c', '#602060',
  '#caff80', '#ffb21a', '#00b21e', '#ff1aff', '#80d4ff', '#ff1ab2', '#8095ff', '#1a1aff',
] as const;
export const CORE_COLOR_FAMILIES = [
  'crimson', 'tangerine', 'gold', 'chartreuse', 'forest', 'emerald', 'teal', 'cyan',
  'azure', 'cobalt', 'indigo', 'violet', 'magenta', 'rose', 'umber', 'slate',
  'electric-green', 'signal-yellow', 'sandstone', 'electric-cyan', 'orchid-mist', 'spring-mint', 'salmon', 'aubergine',
  'citron', 'amber', 'kelly', 'neon-magenta', 'glacier', 'hot-pink', 'periwinkle', 'ultramarine',
] as const;
export const normalizedPaletteIsUnique = (colors: readonly string[] = CORE_COLOR_PALETTE) =>
  new Set(colors.map(color => color.trim().toLowerCase())).size === colors.length;
export const paletteFamiliesAreDistinct = () => new Set(CORE_COLOR_FAMILIES).size === CORE_COLOR_PALETTE.length;
export const paletteWithCurrentColor = (current?: string | null) => current && !CORE_COLOR_PALETTE.some(color => color.toLowerCase() === current.toLowerCase()) ? [current, ...CORE_COLOR_PALETTE] : [...CORE_COLOR_PALETTE];

const lab = (hex: string) => {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v > .04045 ? ((v + .055) / 1.055) ** 2.4 : v / 12.92);
  const x = (rgb[0] * .4124 + rgb[1] * .3576 + rgb[2] * .1805) / .95047;
  const y = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  const z = (rgb[0] * .0193 + rgb[1] * .1192 + rgb[2] * .9505) / 1.08883;
  const f = (v: number) => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
/** CIE76 is intentionally simple and deterministic; 12 is conservative given the immutable legacy first 16. */
export const minimumPaletteCIE76 = (colors: readonly string[] = CORE_COLOR_PALETTE) => {
  let minimum = Infinity;
  colors.forEach((color, i) => colors.slice(0, i).forEach(other => {
    const a = lab(color), b = lab(other);
    minimum = Math.min(minimum, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }));
  return minimum;
};
