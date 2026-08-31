export type DateTemporalState = {
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
};

import { countCalendarMonthsInclusive } from './gridWindow.js';

export type GridExportDatePreset = 'currentGrid' | 'calendarYear' | 'q1' | 'q2' | 'q3' | 'q4' | 'currentMonth' | 'next7' | 'next14' | 'next30' | 'today' | 'custom' | 'current';

const addCalendarDays = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

/** Resolves export dates without consulting selection or scroll state. */
export const resolveExportDateRange = (
  preset: GridExportDatePreset,
  gridWindow: { start: string; end: string } | number,
  anchorYearOrToday: number | string,
  todayOrCustomStart = '',
  customStartOrEnd = '',
  customEnd = '',
) => {
  // Legacy signature (preset, year, today, customStart, customEnd) remains supported.
  const legacy = typeof gridWindow === 'number';
  const anchorYear = legacy ? gridWindow : anchorYearOrToday as number;
  const today = legacy ? anchorYearOrToday as string : todayOrCustomStart;
  const customStart = legacy ? todayOrCustomStart : customStartOrEnd;
  const resolvedCustomEnd = legacy ? customStartOrEnd : customEnd;
  if (preset === 'currentGrid') return typeof gridWindow === 'number' ? { start: `${gridWindow}-01-01`, end: `${gridWindow}-12-31` } : gridWindow;
  if (preset === 'current' || preset === 'calendarYear') return { start: `${anchorYear}-01-01`, end: `${anchorYear}-12-31` };
  if (preset === 'today') return { start: today, end: today };
  if (preset === 'currentMonth') {
    const [localYear, localMonth] = today.split('-').map(Number);
    const lastDay = new Date(localYear, localMonth, 0).getDate();
    return { start: `${localYear}-${String(localMonth).padStart(2, '0')}-01`, end: `${localYear}-${String(localMonth).padStart(2, '0')}-${lastDay}` };
  }
  if (/^q[1-4]$/.test(preset)) {
    const quarter = Number(preset.slice(1)), firstMonth = (quarter - 1) * 3 + 1, endMonth = firstMonth + 2;
    const lastDay = new Date(Date.UTC(anchorYear, endMonth, 0)).getUTCDate();
    return { start: `${anchorYear}-${String(firstMonth).padStart(2, '0')}-01`, end: `${anchorYear}-${String(endMonth).padStart(2, '0')}-${lastDay}` };
  }
  if (preset === 'custom') return { start: customStart, end: resolvedCustomEnd };
  const days = preset === 'next7' ? 7 : preset === 'next14' ? 14 : 30;
  return { start: today, end: addCalendarDays(today, days - 1) };
};

type ExportableEvent = { date: string; endDate?: string | null; category: string; showInExport?: boolean };

/** Shared ordering of export predicates: privacy, range, category, then project. */
export const filterEventsForGridExport = <T extends ExportableEvent>(
  events: readonly T[],
  range: { start: string; end: string },
  selectedCategories: ReadonlySet<string> | null,
  projectId: string | null,
  eventProjectIds: (event: T) => ReadonlySet<string> = () => new Set(),
) => events.filter(event => {
  if (event.showInExport === false) return false;
  if (event.date > range.end || (event.endDate ?? event.date) < range.start) return false;
  if (selectedCategories && !selectedCategories.has(event.category)) return false;
  if (projectId && !eventProjectIds(event).has(projectId)) return false;
  return true;
});

/** Compares ISO calendar dates rather than instants, avoiding timezone rollover bugs. */
export const getDateTemporalState = (date: string, today: string, selectedDate: string | null): DateTemporalState => ({
  isPast: date < today,
  isToday: date === today,
  isSelected: date === selectedDate,
});

export const validateExportRange = (
  range: { start: string; end: string },
  gridYear: number,
  targeted = false,
  targetedMaxDays = 45,
): string | null => {
  const { start, end } = range;
  if (!start || !end) return 'Choose both a start and end date.';
  if (start > end) return 'The export start date must be on or before the end date.';
  if (targeted) {
    if (countCalendarMonthsInclusive(start, end) > 12) return 'Choose a range spanning no more than 12 calendar months.';
  }
  return null;
};

export const truncatePreviewNote = (note: string | null | undefined, limit = 180) => {
  const value = note?.trim() ?? '';
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
};
