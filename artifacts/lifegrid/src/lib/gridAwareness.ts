export type DateTemporalState = {
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
};

export type GridExportDatePreset = 'current' | 'next7' | 'next14' | 'next30' | 'custom';

const addCalendarDays = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

/** Resolves export dates without consulting selection or scroll state. */
export const resolveExportDateRange = (
  preset: GridExportDatePreset,
  gridYear: number,
  today: string,
  customStart = '',
  customEnd = '',
) => {
  if (preset === 'current') return { start: `${gridYear}-01-01`, end: `${gridYear}-12-31` };
  if (preset === 'custom') return { start: customStart, end: customEnd };
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
  if (!targeted && (!start.startsWith(`${gridYear}-`) || !end.startsWith(`${gridYear}-`))) {
    return `Choose dates inside the ${gridYear} grid.`;
  }
  if (targeted) {
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    const inclusiveDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (!Number.isFinite(inclusiveDays) || inclusiveDays > targetedMaxDays) {
      return `Choose a range of ${targetedMaxDays} days or fewer.`;
    }
  }
  return null;
};

export const truncatePreviewNote = (note: string | null | undefined, limit = 180) => {
  const value = note?.trim() ?? '';
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
};
