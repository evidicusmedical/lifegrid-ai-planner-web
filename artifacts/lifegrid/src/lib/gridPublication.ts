import { APP_VERSION } from './version.js';

export type ExportDensity = 'compact' | 'detailed';
export const EXPORT_DENSITY = {
  compact: { cellLimit: 5, titleClamp: 1, pixelRatio: 1, width: 1320, padding: 24 },
  detailed: { cellLimit: 8, titleClamp: 2, pixelRatio: 2, width: 1760, padding: 36 },
} as const;

export const OTHER_LEGEND = { id: 'other', label: 'Other', color: '#64748b' };

type ExportRecord = { category?: string | null; showInExport?: boolean };
type ExportCategory = { id: string; label: string; color: string };

/** Creates a stable, non-mutating category key from the records actually rendered. */
export const buildExportLegend = (records: ExportRecord[], categories: ExportCategory[]) => {
  const counts = new Map<string, number>();
  records.filter(record => record.showInExport !== false).forEach(record => {
    const id = record.category || OTHER_LEGEND.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  const byId = new Map(categories.map(category => [category.id, category]));
  const entries = [
    ...categories.filter(category => counts.has(category.id)).map(category => ({ ...category, count: counts.get(category.id) ?? 0 })),
    ...[...counts.keys()].filter(id => !byId.has(id)).map(id => ({ ...OTHER_LEGEND, count: counts.get(id) ?? 0, id })),
  ];
  return { representedCategoryIds: entries.map(entry => entry.id), entries, recordCount: [...counts.values()].reduce((sum, count) => sum + count, 0) };
};

export const sanitizeExportText = (value: string, maxLength = 120) => value.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLength);

export const formatExportDateRange = (start: string, end: string, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone });
  const parse = (date: string) => new Date(`${date}T12:00:00Z`);
  return start === end ? formatter.format(parse(start)) : `${formatter.format(parse(start))}–${formatter.format(parse(end))}`;
};

export const buildExportMetadata = (options: { calendarName: string; start: string; end: string; timeZone: string; customTitle?: string; customSubtitle?: string; generatedAt?: Date | null }) => {
  const title = sanitizeExportText(options.customTitle || options.calendarName, 120);
  const subtitle = sanitizeExportText(options.customSubtitle || '', 180);
  const metadata = [formatExportDateRange(options.start, options.end, options.timeZone), `Display timezone: ${options.timeZone}`, `LifeGrid ${APP_VERSION}`];
  if (options.generatedAt) metadata.push(`Generated ${new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: options.timeZone }).format(options.generatedAt)} ${options.timeZone}`);
  return { title, subtitle, metadata };
};

export const getDenseDay = <T>(records: readonly T[], limit: number) => ({ visible: records.slice(0, limit), overflow: Math.max(0, records.length - limit), overflowLabel: `${Math.max(0, records.length - limit)} more records; open day details` });

export const getExportDimensions = (density: ExportDensity, legendEntries: number, isTargeted = false) => {
  const config = EXPORT_DENSITY[density];
  const legendRows = Math.max(1, Math.ceil(legendEntries / (density === 'detailed' ? 5 : 7)));
  return { width: isTargeted ? config.width : Math.max(config.width, 1380), height: (isTargeted ? 260 : 105) + config.padding * 2 + legendRows * (density === 'detailed' ? 32 : 26), legendRows };
};
