import type { AppData, Calendar, Store } from '../types';
import { browserTimeZone, migrateTemporal } from './temporal.js';

export const BACKUP_SCHEMA_VERSION = 6;
const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const safeZone = (zone: unknown) => { try { if (typeof zone === 'string') { Intl.DateTimeFormat(undefined, { timeZone: zone }); return zone; } } catch {} return browserTimeZone(); };
const appData = (raw: any): AppData => {
  if (!raw || typeof raw !== 'object') throw new Error('Backup calendar data is invalid.');
  for (const key of ['events','tasks','personEvents','categories','people','projects']) if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error(`Backup collection ${key} must be an array.`);
  return { events: (raw.events ?? []).map((x: any) => migrateTemporal(deepCopy(x))), tasks: deepCopy(raw.tasks ?? []), personEvents: (raw.personEvents ?? []).map((x: any) => migrateTemporal(deepCopy(x))), categories: deepCopy(raw.categories ?? []), people: deepCopy(raw.people ?? []), projects: deepCopy(raw.projects ?? []) } as AppData;
};
export const serializeBackup = (store: Store, exportedAt = new Date().toISOString()) => JSON.stringify({ app: 'lifegrid', version: BACKUP_SCHEMA_VERSION, exportedAt, store: deepCopy(store) }, null, 2);
export const parseBackup = (json: string) => { try { return JSON.parse(json); } catch { throw new Error('Backup JSON could not be parsed.'); } };
export function normalizeBackup(parsed: any): Store {
  const source = parsed?.store ?? parsed;
  if (!source || typeof source !== 'object') throw new Error('Unrecognized backup format.');
  if (typeof parsed?.version === 'number' && parsed.version > BACKUP_SCHEMA_VERSION) throw new Error(`Unsupported backup version ${parsed.version}.`);
  if (!Array.isArray(source.calendars) || !source.calendars.length) throw new Error('Backup contains no calendars.');
  const ids = new Set<string>(); const calendars: Calendar[] = source.calendars.map((raw: any, index: number) => { const id = String(raw?.id ?? `imported-${index}`); if (ids.has(id)) throw new Error(`Duplicate calendar id: ${id}`); ids.add(id); return { id, name: typeof raw?.name === 'string' ? raw.name : 'Calendar', createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(), displayTimeZone: safeZone(raw?.displayTimeZone), data: appData(raw?.data) }; });
  const activeCalendarId = typeof source.activeCalendarId === 'string' && ids.has(source.activeCalendarId) ? source.activeCalendarId : calendars[0].id;
  return { calendars, activeCalendarId };
}
export const restoreBackupIntoStore = (current: Store, parsed: any): Store => normalizeBackup(parsed);

/** Browser-only download remains separate from serialization and restoration. */
export const downloadCurrentBackup = (app: { exportBackup: () => string; activeCalendar: Calendar; recordBackup: () => void }) => {
  const blob = new Blob([app.exportBackup()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `lifegrid-backup-${app.activeCalendar.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'calendar'}.json`; a.click(); URL.revokeObjectURL(url); app.recordBackup();
};
