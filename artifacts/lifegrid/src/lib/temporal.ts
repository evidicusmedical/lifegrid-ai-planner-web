import type { Event, PersonEvent, TimeStatus, TimeZoneMode } from '../types';

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const isIanaTimeZone = (value: unknown): value is string => { try { return typeof value === 'string' && !!value && (new Intl.DateTimeFormat('en-US', { timeZone: value })).resolvedOptions().timeZone === value; } catch { return false; } };
const timeOk = (v: unknown) => v === null || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
export type TemporalRecord = Pick<Event, 'date' | 'endDate' | 'timeStatus' | 'startTime' | 'endTime' | 'timeZone' | 'timeZoneMode'>;
export const temporalErrors = (e: TemporalRecord): string[] => {
 const out: string[] = []; const status = e.timeStatus;
 if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) out.push('Start date is required.');
 if (e.endDate && e.endDate < e.date) out.push('End date cannot precede start date.');
 if (!timeOk(e.startTime) || !timeOk(e.endTime)) out.push('Times must use HH:MM.');
 if (status === 'all-day' || status === 'unknown') { if (e.startTime || e.endTime || e.timeZone || e.timeZoneMode) out.push(`${status === 'all-day' ? 'All-day' : 'Unknown-time'} records cannot include clock times or timezone handling.`); }
 if (status === 'timed' && (!e.startTime || !e.endTime)) out.push('Timed events require both start and end times.');
 if ((status === 'timed' || (status === 'approximate' && (e.startTime || e.endTime))) && (!!e.startTime !== !!e.endTime)) out.push('Provide both start and end times.');
 if (e.startTime && e.endTime && (!e.endDate || e.endDate === e.date) && e.endTime <= e.startTime) out.push('On the same date, end time must be after start time. Use a later end date for overnight events.');
 if (e.startTime || e.endTime) { if (e.timeZoneMode === 'zoned' && !isIanaTimeZone(e.timeZone)) out.push('Specific timezone events require a valid IANA timezone.'); if (e.timeZoneMode === 'floating' && e.timeZone) out.push('Floating local time cannot store a timezone.'); if (!e.timeZoneMode) out.push('Choose specific timezone or floating local time.'); }
 return out;
};
export const migrateTemporal = <T extends Partial<Event | PersonEvent>>(record: T): T & Partial<TemporalRecord> => {
 const start = record.startTime ?? null, end = record.endTime ?? null;
 if ((record as Event).timeStatus) return { ...record, endDate: (record as Event).endDate ?? (record as Event).date ?? null };
 if ((record as Event).eventKind === 'day-type') return { ...record, startTime: null, endTime: null, endDate: (record as Event).date ?? null, timeStatus: 'all-day', timeZone: null, timeZoneMode: null };
 if (start && end && end > start) return { ...record, endDate: (record as Event).date ?? null, timeStatus: 'timed', timeZone: null, timeZoneMode: 'floating' };
 return { ...record, endDate: (record as Event).date ?? null, timeStatus: 'unknown', timeZone: null, timeZoneMode: null, temporalReview: start === end ? 'same-time' : start ? 'start-only' : end ? 'end-only' : 'legacy-unspecified' };
};
export const temporalSummary = (e: TemporalRecord) => {
 if (e.timeStatus === 'all-day') return 'All day'; if (e.timeStatus === 'unknown') return 'Time unknown';
 const prefix = e.timeStatus === 'approximate' ? 'Approx. ' : ''; const range = e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : 'Time approximate';
 const end = e.endDate && e.endDate !== e.date ? ` → ${e.endDate}` : ''; return `${prefix}${range}${end}${e.timeZoneMode === 'floating' ? ' floating local time' : e.timeZone ? ` ${e.timeZone}` : ''}`;
};
