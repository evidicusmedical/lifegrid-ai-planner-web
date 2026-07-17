import type { Event, PersonEvent, TimeStatus, TimeZoneMode } from '../types';

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const isIanaTimeZone = (value: unknown): value is string => { try { return typeof value === 'string' && !!value && (new Intl.DateTimeFormat('en-US', { timeZone: value })).resolvedOptions().timeZone === value; } catch { return false; } };
const timeOk = (v: unknown) => v === null || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
export type TemporalRecord = Pick<Event, 'date' | 'endDate' | 'timeStatus' | 'timeZone' | 'timeZoneMode'> & { startTime?: string | null; endTime?: string | null };
export type TemporalFinding = { code: string; field?: string; message: string; blocking: boolean };
export type DisplayedTemporalOccurrence = TemporalRecord & { displayedStartDate: string; displayedStartTime: string | null; displayedEndDate: string | null; displayedEndTime: string | null; converted: boolean; sourceTimeZone: string | null; displayTimeZone: string | null; durationMinutes: number | null; validation: 'valid' | 'invalid' | 'ambiguous' };

const partsInZone = (instant: Date, zone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
};
/** Maps a local IANA clock time to an instant without silently resolving DST gaps/folds. */
const localCandidates = (date: string, time: string, zone: string) => {
  const target = `${date} ${time}`;
  const nominal = Date.parse(`${date}T${time}:00Z`);
  const candidates: Date[] = [];
  for (let ms = nominal - 18 * 3600000; ms <= nominal + 18 * 3600000; ms += 60000) {
    const p = partsInZone(new Date(ms), zone);
    if (`${p.date} ${p.time}` === target) candidates.push(new Date(ms));
  }
  return candidates;
};
export const zonedLocalToInstant = (date: string, time: string, zone: string): Date | null => {
 const candidates = isIanaTimeZone(zone) ? localCandidates(date, time, zone) : [];
 return candidates.length === 1 ? candidates[0] : null;
};
export const getDisplayedTemporalOccurrence = (record: TemporalRecord, displayTimeZone?: string | null): DisplayedTemporalOccurrence => {
  const fallback: DisplayedTemporalOccurrence = { ...record, displayedStartDate: record.date, displayedStartTime: record.startTime ?? null, displayedEndDate: record.endDate ?? record.date, displayedEndTime: record.endTime ?? null, converted: false, sourceTimeZone: record.timeZone, displayTimeZone: displayTimeZone ?? null, durationMinutes: null, validation: 'valid' };
  if (!record.startTime || !record.endTime || record.timeZoneMode !== 'zoned' || !record.timeZone || !displayTimeZone || !isIanaTimeZone(record.timeZone) || !isIanaTimeZone(displayTimeZone)) return fallback;
  const starts = localCandidates(record.date, record.startTime, record.timeZone);
  const ends = localCandidates(record.endDate ?? record.date, record.endTime, record.timeZone);
  if (starts.length !== 1 || ends.length !== 1) return { ...fallback, validation: starts.length > 1 || ends.length > 1 ? 'ambiguous' : 'invalid' };
  const start = partsInZone(starts[0], displayTimeZone); const end = partsInZone(ends[0], displayTimeZone);
  return { ...fallback, displayedStartDate: start.date, displayedStartTime: start.time, displayedEndDate: end.date, displayedEndTime: end.time, converted: record.timeZone !== displayTimeZone, durationMinutes: Math.round((ends[0].getTime() - starts[0].getTime()) / 60000), validation: 'valid' };
};
export const temporalFindings = (record: TemporalRecord): TemporalFinding[] => temporalErrors(record).map(message => ({ code: message.includes('timezone') ? 'INVALID_TIMEZONE' : message.includes('end') ? 'INVALID_TIME_RANGE' : 'INVALID_TEMPORAL_RECORD', message, blocking: true }));
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
 if (!['all-day', 'timed', 'unknown', 'approximate'].includes(status)) out.push('Choose a valid time type.');
 if (e.startTime && e.timeZoneMode === 'zoned' && isIanaTimeZone(e.timeZone)) { for (const [date, time] of [[e.date, e.startTime], [e.endDate ?? e.date, e.endTime]] as [string, string | null | undefined][]) { if (!time) continue; const matches = localCandidates(date, time, e.timeZone).length; if (matches === 0) out.push('This local time does not exist because of daylight-saving time.'); if (matches > 1) out.push('This local time is ambiguous because of daylight-saving time; choose a different time.'); } }
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

export type TemporalReviewIssue = { key: string; recordType: 'event' | 'person-schedule'; recordId: string; title: string; date: string; code: string; severity: 'blocking' | 'advisory'; blocking: boolean; explanation: string };
/** Pure, non-mutating issue index. Callers pass only the active calendar's data. */
export const analyzeTemporalReview = (events: Array<TemporalRecord & { id: string; title: string }>, personEvents: Array<TemporalRecord & { id: string; title: string }>): TemporalReviewIssue[] => {
 const inspect = (record: TemporalRecord & { id: string; title: string }, recordType: TemporalReviewIssue['recordType']) => {
   const entries: Array<[string, string, boolean]> = [];
   const add = (code: string, explanation: string, blocking = true) => entries.push([code, explanation, blocking]);
   if (!record.timeStatus) add('MISSING_TIME_STATUS', 'Confirm whether this is all day or time unknown.', false);
   if (record.startTime && !record.endTime) add('START_WITHOUT_END', 'Choose an end time.');
   if (!record.startTime && record.endTime) add('END_WITHOUT_START', 'Choose a start time.');
   if (record.startTime && record.endTime && record.date === (record.endDate ?? record.date) && record.startTime === record.endTime) add('SAME_START_END', 'Choose a later end time or a later end date for an overnight record.');
   if (record.endDate && record.endDate < record.date) add('END_BEFORE_START_DATE', 'Choose a later end date for an overnight record.');
   if (record.timeZoneMode === 'zoned' && !record.timeZone) add('ZONED_WITHOUT_TIMEZONE', 'Select a valid IANA timezone.');
   if (record.timeZoneMode === 'floating' && record.timeZone) add('FLOATING_WITH_TIMEZONE', 'Floating local time cannot include a timezone.');
   if (record.timeZone && !isIanaTimeZone(record.timeZone)) add('INVALID_TIMEZONE', 'Select a valid IANA timezone.');
   for (const message of temporalErrors(record)) { if (message.includes('does not exist')) add('DST_GAP', 'This local time does not exist because of daylight saving time.'); else if (message.includes('ambiguous')) add('DST_FOLD', 'This local time occurs twice; select a different time.'); else if (!entries.some(e => e[0] === 'INVALID_TEMPORAL_COMBINATION')) add('INVALID_TEMPORAL_COMBINATION', message); }
   if ((record as any).temporalReview) add('MIGRATION_REVIEW_REQUIRED', 'Confirm whether this legacy record is all day or time unknown.', false);
   return entries.map(([code, explanation, blocking]) => ({ key: `${recordType}:${record.id}:${code}`, recordType, recordId: record.id, title: record.title, date: record.date, code, severity: blocking ? 'blocking' as const : 'advisory' as const, blocking, explanation }));
 };
 return [...events.flatMap(e => inspect(e, 'event')), ...personEvents.flatMap(e => inspect(e, 'person-schedule'))];
};
