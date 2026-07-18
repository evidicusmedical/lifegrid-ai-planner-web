/** Development-only, privacy-safe Grid transition marks. No record data is collected. */
export const GRID_MARKS = [
  'lifegrid:grid-navigation-click', 'lifegrid:grid-route-state-updated',
  'lifegrid:grid-view-mounted', 'lifegrid:grid-model-start', 'lifegrid:grid-index-start',
  'lifegrid:grid-index-complete', 'lifegrid:grid-model-complete', 'lifegrid:grid-dom-start',
  'lifegrid:grid-first-commit', 'lifegrid:grid-first-visible-cell',
  'lifegrid:grid-dom-complete', 'lifegrid:grid-interaction-ready',
] as const;

const enabled = () => import.meta.env.DEV && typeof performance !== 'undefined' && typeof performance.mark === 'function';
export const gridMark = (name: string) => { if (enabled()) performance.mark(name); };

export const beginGridTransition = () => {
  if (!enabled()) return;
  performance.clearMarks?.();
  performance.clearMeasures?.();
  gridMark('lifegrid:grid-navigation-click');
};

export const installGridDiagnostics = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  (window as Window & { lifegridGridTiming?: () => Record<string, number | null> }).lifegridGridTiming = () => {
    const marks = performance.getEntriesByType?.('mark') ?? [];
    const at = (name: string) => marks.filter(entry => entry.name === name).at(-1)?.startTime;
    const click = at('lifegrid:grid-navigation-click');
    return Object.fromEntries(GRID_MARKS.map(name => [name.replace('lifegrid:', ''), click === undefined || at(name) === undefined ? null : Number((at(name)! - click).toFixed(2))]));
  };
};
