import type { Event } from '../types';

const dayNumber = (date: string) => { const [y,m,d] = date.split('-').map(Number); return Date.UTC(y,m-1,d) / 86400000; };
const dateFromDay = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
export function normalizeAllDayOccurrenceRange(date: string, masterDate: string, masterEndDate: string | null | undefined) {
  const duration = masterEndDate && masterEndDate >= masterDate ? dayNumber(masterEndDate) - dayNumber(masterDate) : 0;
  return { date, endDate: dateFromDay(dayNumber(date) + duration) };
}
const STRUCTURAL: (keyof Event)[] = ['date','endDate','startTime','endTime','title','timeStatus'];
export function isNotesOnlyRecurrenceEdit(before: Event, after: Partial<Event>) {
  const changed = (Object.keys(after) as (keyof Event)[]).filter(key => after[key] !== undefined && after[key] !== before[key]);
  return changed.length > 0 && changed.every(key => (['notes','aiNotes','sourceNotes'] as string[]).includes(key)) && !STRUCTURAL.some(key => changed.includes(key));
}
