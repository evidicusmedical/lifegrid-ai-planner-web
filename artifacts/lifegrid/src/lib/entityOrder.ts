/** Stable, immutable ordering for per-calendar workspace entities. */
export type OrderedEntity = { order?: number };
export function normalizeEntityOrder<T extends OrderedEntity>(items: readonly T[]): (T & { order: number })[] {
  return items.map((item, index) => ({ ...item, _index: index, _valid: Number.isFinite(item.order) && (item.order as number) >= 0 }))
    .sort((a, b) => a._valid === b._valid ? (a._valid ? (a.order! - b.order! || a._index - b._index) : a._index - b._index) : a._valid ? -1 : 1)
    .map(({ _index, _valid, ...item }, order) => ({ ...item, order } as unknown as T & { order: number }));
}
export function moveEntity<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return [...items];
  const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next;
}
