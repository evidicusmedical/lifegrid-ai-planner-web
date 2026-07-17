export type ExportPreset = 'month' | 'next30' | 'next90' | 'year' | 'all' | 'custom';
export type DateRange = { start: string | null; end: string | null };

const iso = (date: Date) => date.toISOString().slice(0, 10);
export const exportRangeFor = (preset: ExportPreset, custom: DateRange, now = new Date()): DateRange => {
  if (preset === 'all') return { start: null, end: null };
  if (preset === 'custom') return custom;
  if (preset === 'month') return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  if (preset === 'year') return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
  const end = new Date(now); end.setDate(end.getDate() + (preset === 'next30' ? 30 : 90));
  return { start: iso(now), end: iso(end) };
};
export const validateDateRange = ({ start, end }: DateRange): string | null =>
  !start || !end ? 'Choose both a start and end date.' : start > end ? 'The start date must be on or before the end date.' : null;
export const dateIsInRange = (date: string, range: DateRange) => (!range.start || date >= range.start) && (!range.end || date <= range.end);
export const formatExportRange = (range: DateRange) => range.start && range.end ? `${range.start} → ${range.end}` : 'All events';
