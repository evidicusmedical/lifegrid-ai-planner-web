import type { AppData, Calendar, Store } from '../types';
import { migrateTemporal } from './temporal.js';
import { normalizeMilestones } from './projectOperations.js';
import { buildLifeGridExportFilename } from './exportFilenames.js';

export const BACKUP_SCHEMA_VERSION = 7;
const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const withoutTimezone = <T,>(value: T): T => { const copy = deepCopy(value) as any; for (const calendar of copy.calendars ?? []) { delete calendar.displayTimeZone; for (const event of [...(calendar.data?.events ?? []), ...(calendar.data?.personEvents ?? [])]) { delete event.timeZone; delete event.timeZoneMode; } } return copy; };
const appData = (raw: any): AppData => {
  if (!raw || typeof raw !== 'object') throw new Error('Backup calendar data is invalid.');
  for (const key of ['events','tasks','personEvents','categories','people','projects','milestones']) if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error(`Backup collection ${key} must be an array.`);
  const projects = deepCopy(raw.projects ?? []); return { events: (raw.events ?? []).map((x: any) => migrateTemporal(deepCopy(x))), tasks: deepCopy(raw.tasks ?? []), personEvents: (raw.personEvents ?? []).map((x: any) => migrateTemporal(deepCopy(x))), categories: deepCopy(raw.categories ?? []), people: deepCopy(raw.people ?? []), projects, milestones: normalizeMilestones(raw.milestones, projects.map((p: any) => p.id)) } as AppData;
};
export const serializeBackup = (store: Store, exportedAt = new Date().toISOString()) => JSON.stringify({ app: 'lifegrid', version: BACKUP_SCHEMA_VERSION, exportedAt, store: withoutTimezone(store) }, null, 2);
export const parseBackup = (json: string) => { try { return JSON.parse(json); } catch { throw new Error('Backup JSON could not be parsed.'); } };
export function normalizeBackup(parsed: any): Store {
  const source = parsed?.store ?? parsed;
  if (!source || typeof source !== 'object') throw new Error('Unrecognized backup format.');
  if (typeof parsed?.version === 'number' && parsed.version > BACKUP_SCHEMA_VERSION) throw new Error(`Unsupported backup version ${parsed.version}.`);
  if (!Array.isArray(source.calendars) || !source.calendars.length) throw new Error('Backup contains no calendars.');
  const ids = new Set<string>(); const calendars: Calendar[] = source.calendars.map((raw: any, index: number) => { const id = String(raw?.id ?? `imported-${index}`); if (ids.has(id)) throw new Error(`Duplicate calendar id: ${id}`); ids.add(id); return { id, name: typeof raw?.name === 'string' ? raw.name : 'Calendar', createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(), displayTimeZone: 'local', data: appData(raw?.data) }; });
  const activeCalendarId = typeof source.activeCalendarId === 'string' && ids.has(source.activeCalendarId) ? source.activeCalendarId : calendars[0].id;
  return { calendars, activeCalendarId };
}
export const restoreBackupIntoStore = (current: Store, parsed: any): Store => normalizeBackup(parsed);

/** Browser-only download remains separate from serialization and restoration. */
export const downloadCurrentBackup = (app: { exportBackup: () => string; activeCalendar: Calendar; recordBackup: () => void }) => {
  const blob = new Blob([app.exportBackup()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = buildLifeGridExportFilename({ kind: 'json_backup', calendarName: app.activeCalendar.name, generatedAt: new Date(), timeZone: app.activeCalendar.displayTimeZone }); a.click(); URL.revokeObjectURL(url); app.recordBackup();
};
