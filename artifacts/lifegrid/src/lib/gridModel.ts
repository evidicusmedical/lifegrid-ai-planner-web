import type { Event, TimeStatus } from '../types';
import { getDisplayedTemporalOccurrence } from './temporal.js';

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

/** Selects source records before temporal conversion. Zoned records get a one-day safety
 * margin because a valid displayed occurrence can cross a date boundary. Invalid dates
 * remain included, matching the former index's non-dropping policy. */
export const selectEventsIntersectingYear = (events: readonly Event[], year: number, _timeZone: string): readonly Event[] => {
  const start = `${year}-01-01`, end = `${year}-12-31`;
  return events.filter(event => {
    if (!DATE.test(event.date) || (event.endDate !== null && !DATE.test(event.endDate))) return true;
    const margin = event.timeZoneMode === 'zoned' && event.startTime ? 1 : 0;
    const eventStart = margin ? shiftDate(event.date, -margin) : event.date;
    const rawEnd = event.endDate && event.endDate >= event.date ? event.endDate : event.date;
    const eventEnd = margin ? shiftDate(rawEnd, margin) : rawEnd;
    return eventStart <= end && eventEnd >= start;
  });
};

export const toGridEventSummary = (event: Event, timeZone?: string): GridEventSummary => {
  const occurrence = getDisplayedTemporalOccurrence(event, timeZone);
  return Object.freeze({ id: event.id, date: occurrence.displayedStartDate, endDate: occurrence.displayedEndDate ?? occurrence.displayedStartDate,
    title: event.title, category: event.category, color: event.color ?? null, displayPriority: event.displayPriority ?? 4,
    timeStatus: event.timeStatus, startTime: occurrence.displayedStartTime, endTime: occurrence.displayedEndTime,
    eventKind: event.eventKind ?? null, showInGrid: event.showInGrid !== false });
};

export const gridSummarySignature = (event: Event, timeZone: string) => {
  const s = toGridEventSummary(event, timeZone);
  return [s.id,s.date,s.endDate,s.title,s.category,s.color,s.displayPriority,s.timeStatus,s.startTime,s.endTime,s.eventKind,s.showInGrid].join('|');
};

const compare = (rank: ReadonlyMap<string, number>) => (a: GridEventSummary, b: GridEventSummary) =>
  a.displayPriority - b.displayPriority || Number(!a.startTime) - Number(!b.startTime) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || (rank.get(a.category) ?? 999) - (rank.get(b.category) ?? 999) || a.title.localeCompare(b.title);

export const buildGridViewModel = (events: readonly Event[], year: number, timeZone: string, categoryRank = new Map<string, number>(), previous?: GridViewModel): GridViewModel => {
  const summaries = selectEventsIntersectingYear(events, year, timeZone).map(event => toGridEventSummary(event, timeZone)).filter(summary => summary.date.slice(0, 4) === String(year));
  const byDate = new Map<string, GridEventSummary[]>();
  for (const summary of summaries) { const bucket = byDate.get(summary.date) ?? []; bucket.push(summary); byDate.set(summary.date, bucket); }
  byDate.forEach(bucket => bucket.sort(compare(categoryRank)));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    const entries = [...byDate.entries()].filter(([date]) => date.startsWith(month));
    const signature = entries.map(([date, values]) => `${date}:${values.map(value => [value.id,value.title,value.category,value.color,value.startTime,value.endTime,value.displayPriority].join('~')).join(',')}`).join(';');
    const old = previous?.months[index];
    if (old?.monthKey === month && old.signature === signature) return old;
    return Object.freeze({ monthKey: month, eventsByDate: new Map(entries.map(([date, values]) => [date, Object.freeze([...values])])), eventCount: entries.reduce((n, [, values]) => n + values.length, 0), signature });
  });
  return Object.freeze({ year, summaries: Object.freeze(summaries), months: Object.freeze(months), byDate });
};

export const resolveEventById = (events: readonly Event[], id: string | null) => id ? events.find(event => event.id === id) ?? null : null;
