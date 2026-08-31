export const EXPORT_PRESETS = [
  ['currentGrid', 'Current Grid'], ['calendarYear', 'Calendar Year'],
  ['q1', 'CY Q1'], ['q2', 'CY Q2'], ['q3', 'CY Q3'], ['q4', 'CY Q4'],
  ['currentMonth', 'CY Current Month'], ['next30', 'Next 30'],
  ['next14', 'Next 14'], ['next7', 'Next 7'], ['today', 'Today'], ['custom', 'Custom'],
] as const;

export type ExportTheme = 'light' | 'dark';
export type PublicationLayout = 'day-agenda' | 'rolling-day-grid' | 'month-matrix' | 'month-columns';
export const LETTER_FRAME = { landscape: { width: 1400, height: 1082 }, portrait: { width: 1082, height: 1400 } } as const;

export const createDefaultExportDraft = () => ({
  datePreset: 'currentGrid' as const, customStart: '', customEnd: '', categoryMode: 'all' as const,
  selectedCategoryIds: [] as string[], projectId: 'all', theme: 'light' as ExportTheme,
  includeGeneratedAt: true, customTitle: '', customSubtitle: '',
});

const daysInclusive = (start: string, end: string) => Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
export const isExactCalendarMonth = (start: string, end: string) => {
  if (!/^\d{4}-\d{2}-01$/.test(start) || start.slice(0, 7) !== end.slice(0, 7)) return false;
  const [year, month] = start.split('-').map(Number);
  return Number(end.slice(8)) === new Date(year, month, 0).getDate();
};
export const choosePublicationLayout = (preset: string, start: string, end: string): PublicationLayout => {
  if (preset === 'today' || (preset === 'custom' && start === end)) return 'day-agenda';
  if (preset === 'currentMonth' || (preset === 'custom' && isExactCalendarMonth(start, end))) return 'month-matrix';
  if (['next7', 'next14', 'next30'].includes(preset) || (preset === 'custom' && daysInclusive(start, end) <= 45)) return 'rolling-day-grid';
  return 'month-columns';
};
export const choosePublicationOrientation = (layout: PublicationLayout, eventCount: number) =>
  layout === 'day-agenda' && eventCount <= 16 ? 'portrait' as const : 'landscape' as const;
