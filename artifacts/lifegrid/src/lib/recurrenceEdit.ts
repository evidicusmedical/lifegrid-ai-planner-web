import type { Event } from '../types';

const dayNumber = (date: string) => { const [y,m,d] = date.split('-').map(Number); return Date.UTC(y,m-1,d) / 86400000; };
const dateFromDay = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
export function normalizeAllDayOccurrenceRange(date: string, masterDate: string, masterEndDate: string | null | undefined) {
  const duration = masterEndDate && masterEndDate >= masterDate ? dayNumber(masterEndDate) - dayNumber(masterDate) : 0;
  return { date, endDate: dateFromDay(dayNumber(date) + duration) };
}
export function resolveAllDayEditRange(
  date: string,
  endDate: string | null | undefined,
  initial: Pick<Event, 'date' | 'endDate'>,
  endDateWasEdited: boolean,
) {
  if (endDateWasEdited) return { date, endDate: endDate || date };
  if (date !== initial.date) return normalizeAllDayOccurrenceRange(date, initial.date, initial.endDate);
  return { date, endDate: endDate && endDate >= date ? endDate : date };
}

/** Preserves the first record's inclusive calendar-day span for any repeated time type. */
export function repeatedOccurrenceRange(
  occurrenceDate: string,
  firstDate: string,
  firstEndDate: string | null | undefined,
) {
  return normalizeAllDayOccurrenceRange(occurrenceDate, firstDate, firstEndDate);
}
export const repeatedAllDayOccurrenceRange = repeatedOccurrenceRange;
const STRUCTURAL: (keyof Event)[] = ['date','endDate','startTime','endTime','title','timeStatus'];
export function isNotesOnlyRecurrenceEdit(before: Event, after: Partial<Event>) {
  const equal = (left: unknown, right: unknown) => Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((value, index) => value === right[index])
    : left === right;
  const changed = (Object.keys(after) as (keyof Event)[]).filter(key => after[key] !== undefined && !equal(after[key], before[key]));
  return changed.length > 0 && changed.every(key => (['notes','aiNotes','sourceNotes'] as string[]).includes(key)) && !STRUCTURAL.some(key => changed.includes(key));
}

export type RecurringNotesScope = 'this-event' | 'entire-series';
export function applyRecurringNotesEdit(
  events: readonly Event[],
  editedEvent: Event,
  notes: Pick<Event, 'notes' | 'aiNotes' | 'sourceNotes'>,
  scope: RecurringNotesScope,
): Event[] {
  const sibling = (event: Event) => scope === 'entire-series' && editedEvent.recurringGroupId
    ? event.recurringGroupId === editedEvent.recurringGroupId
    : event.id === editedEvent.id;
  return events.map(event => {
    if (!sibling(event)) return event;
    const repairedRange = event.timeStatus === 'all-day'
      ? resolveAllDayEditRange(event.date, event.endDate, event, false)
      : {};
    return { ...event, ...repairedRange, ...notes };
  });
}
