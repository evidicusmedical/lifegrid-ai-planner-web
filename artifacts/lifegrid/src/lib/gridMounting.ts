export interface MountedMonthState { generation: number; mountedMonthKeys: readonly string[]; firstUsefulReady: boolean; fullGridComplete: boolean; }

export const gridMonthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

/** Deterministic ordering used by the incremental Grid scheduler. */
export const getGridMountOrder = (year: number, currentYear: number, currentMonth: number, selectedMonth?: number | null) => {
  const first = selectedMonth != null && selectedMonth >= 0 && selectedMonth < 12 ? selectedMonth : year === currentYear ? currentMonth : 0;
  const candidates = [first, first - 1, first + 1, ...Array.from({ length: 12 }, (_, month) => month)];
  return candidates.filter((month, index) => month >= 0 && month < 12 && candidates.indexOf(month) === index);
};

/** Two RAFs permit a committed React update to reach a browser paint; timeout prevents background-tab starvation. */
export const yieldToBrowser = (signal?: AbortSignal) => new Promise<void>(resolve => {
  if (signal?.aborted) return resolve();
  let done = false;
  const finish = () => { if (!done) { done = true; resolve(); } };
  const timeout = setTimeout(finish, 120);
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : undefined;
  if (!raf) return;
  raf(() => raf(() => { clearTimeout(timeout); finish(); }));
});
