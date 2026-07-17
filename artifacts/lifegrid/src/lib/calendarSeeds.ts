import { AppData, Calendar } from '../types';
import { defaultData } from './sampleData';

export type CalendarSeedMode = 'empty' | 'copy-structure' | 'sample' | 'duplicate';
export const OTHER_CATEGORY = { id: 'other', label: 'Other', color: '#6b7280' };
export const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const emptyCalendarData = (): AppData => ({ events: [], tasks: [], personEvents: [], people: [], projects: [], categories: [{ ...OTHER_CATEGORY }] });
export const createCalendarSeed = (mode: CalendarSeedMode, source: AppData): AppData => {
  if (mode === 'sample') return cloneData(defaultData) as unknown as AppData;
  if (mode === 'duplicate') return cloneData(source);
  if (mode === 'copy-structure') return { ...emptyCalendarData(), categories: cloneData(source.categories), people: cloneData(source.people), projects: cloneData(source.projects) };
  return emptyCalendarData();
};
export const hasOperationalRecords = (data: AppData) => data.events.length > 0 || data.tasks.length > 0 || data.personEvents.length > 0;
export const resetToTrulyEmpty = (calendar: Calendar): Calendar => ({ ...calendar, data: emptyCalendarData() });
