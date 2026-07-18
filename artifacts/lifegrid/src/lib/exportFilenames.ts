/** Pure, browser-independent names for user-facing LifeGrid downloads. */
export type LifeGridExportKind = 'json_backup' | 'ics_calendar' | 'text_export';

const KINDS: Record<LifeGridExportKind, { descriptor: string; extension: string }> = {
  json_backup: { descriptor: 'json_backup', extension: 'json' },
  ics_calendar: { descriptor: 'ics_calendar', extension: 'ics' },
  text_export: { descriptor: 'text_export', extension: 'txt' },
};

export const sanitizeExportName = (value: string | null | undefined, fallback = 'Calendar') => {
  const normalized = (value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const slug = normalized
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[’'`]/g, '-')
    .replace(/[\\/:|?*"<>]/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug && slug !== '.' && slug !== '..' ? slug : fallback;
};

export const formatExportTimestamp = (generatedAt: Date) => {
  const value = (number: number) => String(number).padStart(2, '0');
  return `${generatedAt.getFullYear()}-${value(generatedAt.getMonth() + 1)}-${value(generatedAt.getDate())}_${value(generatedAt.getHours())}-${value(generatedAt.getMinutes())}-${value(generatedAt.getSeconds())}`;
};

export const buildLifeGridExportFilename = ({ kind, calendarName, generatedAt = new Date(), collisionIndex = 1 }: { kind: LifeGridExportKind; calendarName?: string | null; generatedAt?: Date; timeZone?: string; collisionIndex?: number }) => {
  const config = KINDS[kind];
  const suffix = collisionIndex > 1 ? `_${collisionIndex}` : '';
  return `lifegrid_${config.descriptor}_${sanitizeExportName(calendarName)}_${formatExportTimestamp(generatedAt)}${suffix}.${config.extension}`;
};

/** Compatibility wrapper for existing text export callers. */
export const exportFilename = (kind: 'text_export', calendarName: string, date = new Date()) => buildLifeGridExportFilename({ kind, calendarName, generatedAt: date });
