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

export const formatExportTimestamp = (generatedAt: Date, timeZone?: string) => {
  const safeZone = (() => { try { if (timeZone) new Intl.DateTimeFormat('en-CA', { timeZone }); return timeZone; } catch { return 'UTC'; } })();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: safeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(generatedAt);
  const value = (name: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === name)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}_${value('hour')}-${value('minute')}-${value('second')}`;
};

export const buildLifeGridExportFilename = ({ kind, calendarName, generatedAt = new Date(), timeZone, collisionIndex = 1 }: { kind: LifeGridExportKind; calendarName?: string | null; generatedAt?: Date; timeZone?: string; collisionIndex?: number }) => {
  const config = KINDS[kind];
  const suffix = collisionIndex > 1 ? `_${collisionIndex}` : '';
  return `lifegrid_${config.descriptor}_${sanitizeExportName(calendarName)}_${formatExportTimestamp(generatedAt, timeZone)}${suffix}.${config.extension}`;
};

/** Compatibility wrapper for existing text export callers. */
export const exportFilename = (kind: 'text_export', calendarName: string, date = new Date(), timeZone?: string) => buildLifeGridExportFilename({ kind, calendarName, generatedAt: date, timeZone });
