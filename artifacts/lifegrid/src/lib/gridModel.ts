import type { Event, TimeStatus } from '../types';

/** The deliberately small, immutable record the annual grid is allowed to retain. */
export interface GridEventSummary {
  id: string; date: string; endDate: string; title: string; category: string; color: string | null;
  displayPriority: number; timeStatus: TimeStatus; startTime: string | null; endTime: string | null;
  eventKind: Event['eventKind'] | null; showInGrid: boolean;
}
export interface GridMonthModel { monthKey: string; eventsByDate: ReadonlyMap<string, readonly GridEventSummary[]>; eventCount: number; signature: string; }
export interface GridViewModel { year: number; summaries: readonly GridEventSummary[]; months: readonly GridMonthModel[]; byDate: ReadonlyMap<string, readonly GridEventSummary[]>; }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** v0.5.23 compatibility boundary: editors normalize legacy states, readers do not mutate them. */
export const normalizeEditableTimeStatus = (status: TimeStatus): 'all-day' | 'timed' =>
  status === 'timed' || status === 'approximate' ? 'timed' : 'all-day';
export const normalizeEventTimeForSave = (status: TimeStatus, startTime?: string | null, endTime?: string | null) => {
  const timeStatus = normalizeEditableTimeStatus(status);
  if (timeStatus === 'timed' && (!startTime || !endTime)) throw new Error('Timed events require both a start and end time.');
  return { timeStatus, startTime: timeStatus === 'timed' ? startTime! : null, endTime: timeStatus === 'timed' ? endTime! : null };
};
export const isGridTimed = (status: TimeStatus) => status === 'timed' || status === 'approximate';

export const eventIntersectsDate = (event: Pick<Event, 'date'|'endDate'>, date: string) => {
  if (!DATE.test(event.date) || !DATE.test(date)) return false;
  const end = event.endDate && DATE.test(event.endDate) && event.endDate >= event.date ? event.endDate : event.date;
  return event.date <= date && end >= date;
};

export const eventsForDate = (events: readonly Event[], date: string, categoryRank: ReadonlyMap<string, number>) =>
  [...new Map(events.filter(event => eventIntersectsDate(event, date)).map(event => [event.id, event])).values()]
    .sort(compareGridEvents(categoryRank));

/** One deterministic ordering contract shared by every representation of a grid day. */
export const compareGridEvents = (categoryRank: ReadonlyMap<string, number>) =>
  <T extends Pick<GridEventSummary, 'id'|'title'|'category'|'displayPriority'|'timeStatus'|'startTime'>>(a: T, b: T): number => {
    const timed = Number(!isGridTimed(a.timeStatus)) - Number(!isGridTimed(b.timeStatus));
    if (timed) return timed;
    const priority = a.displayPriority - b.displayPriority;
    if (priority) return priority;
    if (isGridTimed(a.timeStatus) && isGridTimed(b.timeStatus)) {
      const start = (a.startTime ?? '').localeCompare(b.startTime ?? '');
      if (start) return start;
    }
    return (categoryRank.get(a.category) ?? Number.MAX_SAFE_INTEGER) - (categoryRank.get(b.category) ?? Number.MAX_SAFE_INTEGER)
      || a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
      || a.id.localeCompare(b.id);
  };

/** Expands inclusive ranges for display only; the source Event remains a single record. */
export const expandGridEventRange = (summary: GridEventSummary, year: number): GridEventSummary[] => {
  const yearStart = `${year}-01-01`, yearEnd = `${year}-12-31`;
  if (!DATE.test(summary.date) || !DATE.test(summary.endDate)) return summary.date.startsWith(String(year)) ? [summary] : [];
  const start = summary.date < yearStart ? yearStart : summary.date;
  const rawEnd = summary.endDate >= summary.date ? summary.endDate : summary.date;
  const end = rawEnd > yearEnd ? yearEnd : rawEnd;
  if (start > end) return [];
  const result: GridEventSummary[] = [];
  for (let date = start; date <= end; date = shiftDate(date, 1)) result.push(Object.freeze({ ...summary, date }));
  return result;
};

export const expandEventsToDateBuckets = (events: readonly Event[], start: string, end: string, categoryRank: ReadonlyMap<string, number>) => {
  const buckets = new Map<string, GridEventSummary[]>();
  if (!DATE.test(start) || !DATE.test(end) || start > end) return buckets;
  for (const event of events) {
    const eventEnd = event.endDate && DATE.test(event.endDate) && event.endDate >= event.date ? event.endDate : event.date;
    for (let date = event.date < start ? start : event.date; date <= eventEnd && date <= end; date = shiftDate(date, 1)) {
      const bucket = buckets.get(date) ?? [];
      bucket.push({ ...toGridEventSummary(event), date });
      buckets.set(date, bucket);
    }
  }
  buckets.forEach(bucket => bucket.sort(compareGridEvents(categoryRank)));
  return buckets;
};

/** Selects source records before temporal conversion. Zoned records get a one-day safety
 * margin because a valid displayed occurrence can cross a date boundary. Invalid dates
 * remain included, matching the former index's non-dropping policy. */
export const selectEventsIntersectingYear = (events: readonly Event[], year: number, _timeZone?: string): readonly Event[] => {
  const start = `${year}-01-01`, end = `${year}-12-31`;
  return events.filter(event => {
    if (!DATE.test(event.date) || (event.endDate !== null && !DATE.test(event.endDate))) return true;
    const eventStart = event.date;
    const eventEnd = event.endDate && event.endDate >= event.date ? event.endDate : event.date;
    return eventStart <= end && eventEnd >= start;
  });
};

export const toGridEventSummary = (event: Event): GridEventSummary => Object.freeze({ id: event.id, date: event.date, endDate: event.endDate ?? event.date,
    title: event.title, category: event.category, color: event.color ?? null, displayPriority: event.displayPriority ?? 4,
    timeStatus: event.timeStatus, startTime: event.startTime ?? null, endTime: event.endTime ?? null,
    eventKind: event.eventKind ?? null, showInGrid: event.showInGrid !== false });

export const gridSummarySignature = (event: Event) => {
  const s = toGridEventSummary(event);
  return [s.id,s.date,s.endDate,s.title,s.category,s.color,s.displayPriority,s.timeStatus,s.startTime,s.endTime,s.eventKind,s.showInGrid].join('|');
};

export const buildGridViewModel = (events: readonly Event[], year: number, legacyOrRank: string | ReadonlyMap<string, number> = new Map<string, number>(), rankOrPrevious?: ReadonlyMap<string, number> | GridViewModel, previous?: GridViewModel): GridViewModel => {
  const legacyCall = typeof legacyOrRank === 'string';
  const categoryRank = (legacyCall ? rankOrPrevious : legacyOrRank) as ReadonlyMap<string, number>;
  const prior = (legacyCall ? previous : rankOrPrevious) as GridViewModel | undefined;
  const summaries = selectEventsIntersectingYear(events, year).flatMap(event => expandGridEventRange(toGridEventSummary(event), year));
  const byDate = new Map<string, GridEventSummary[]>();
  for (const summary of summaries) { const bucket = byDate.get(summary.date) ?? []; bucket.push(summary); byDate.set(summary.date, bucket); }
  byDate.forEach(bucket => bucket.sort(compareGridEvents(categoryRank)));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    const entries = [...byDate.entries()].filter(([date]) => date.startsWith(month));
    const signature = entries.map(([date, values]) => `${date}:${values.map(value => [value.id,value.title,value.category,value.color,value.startTime,value.endTime,value.displayPriority].join('~')).join(',')}`).join(';');
    const old = prior?.months[index];
    if (old?.monthKey === month && old.signature === signature) return old;
    return Object.freeze({ monthKey: month, eventsByDate: new Map(entries.map(([date, values]) => [date, Object.freeze([...values])])), eventCount: entries.reduce((n, [, values]) => n + values.length, 0), signature });
  });
  return Object.freeze({ year, summaries: Object.freeze(summaries), months: Object.freeze(months), byDate });
};

export const resolveEventById = (events: readonly Event[], id: string | null) => id ? events.find(event => event.id === id) ?? null : null;

/** Applies the interactive category filter before the already-sorted cell is sliced.
 * An empty selection means "all"; a non-empty selection is inclusive OR. */
export const filterGridEventsByCategories = <T extends { category: string }>(records: readonly T[], categoryIds: ReadonlySet<string>): T[] =>
  categoryIds.size === 0 ? [...records] : records.filter(record => categoryIds.has(record.category));
