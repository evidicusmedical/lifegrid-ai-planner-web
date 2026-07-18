import type { Event, PersonEvent } from '../types';

/** Plain calendar-time contract: no instants, offsets, IANA zones, or DST handling. */
export type LocalTemporalRecord = Pick<Event, 'date' | 'endDate' | 'timeStatus'> & { startTime?: string | null; endTime?: string | null; /** legacy import-only, ignored */ timeZone?: string | null; timeZoneMode?: string | null };
export type TemporalRecord = LocalTemporalRecord;
export type TemporalFinding = { code: string; field?: string; message: string; blocking: boolean };
export type LocalTemporalOccurrence = LocalTemporalRecord & { displayedStartDate: string; displayedStartTime: string | null; displayedEndDate: string; displayedEndTime: string | null; converted: false; durationMinutes: number | null; validation: 'valid' | 'invalid' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const dayNumber = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86400000;
export const temporalErrors = (e: TemporalRecord): string[] => {
 const out: string[] = [];
 if (!DATE.test(e.date || '')) out.push('Start date is required.');
 if (e.endDate && (!DATE.test(e.endDate) || e.endDate < e.date)) out.push('End date cannot precede start date.');
 if ((e.startTime !== null && e.startTime !== undefined && !TIME.test(e.startTime)) || (e.endTime !== null && e.endTime !== undefined && !TIME.test(e.endTime))) out.push('Times must use HH:MM.');
 if (!['all-day','timed','unknown','approximate'].includes(e.timeStatus)) out.push('Choose a valid time type.');
 if ((e.timeStatus === 'all-day' || e.timeStatus === 'unknown') && (e.startTime || e.endTime)) out.push('All-day and unknown-time records cannot include clock times.');
 if (e.timeStatus === 'timed' && (!e.startTime || !e.endTime)) out.push('Timed events require both start and end times.');
 if ((e.timeStatus === 'timed' || e.timeStatus === 'approximate') && !!e.startTime !== !!e.endTime) out.push('Provide both start and end times.');
 if (e.startTime && e.endTime && (!e.endDate || e.endDate === e.date) && e.endTime <= e.startTime) out.push('On the same date, end time must be after start time. Use a later end date for overnight events.');
 return out;
};
export const getLocalTemporalOccurrence = (record: LocalTemporalRecord): LocalTemporalOccurrence => {
 const errors = temporalErrors(record);
 const start = record.startTime ?? null, end = record.endTime ?? null;
 const endDate = record.endDate ?? record.date;
 const durationMinutes = start && end && DATE.test(record.date) && DATE.test(endDate) ? (dayNumber(endDate) - dayNumber(record.date)) * 1440 + minutes(end) - minutes(start) : null;
 return { ...record, displayedStartDate: record.date, displayedStartTime: start, displayedEndDate: endDate, displayedEndTime: end, converted: false, durationMinutes, validation: errors.length ? 'invalid' : 'valid' };
};
export const temporalFindings = (record: TemporalRecord): TemporalFinding[] => temporalErrors(record).map(message => ({ code: 'INVALID_TEMPORAL_RECORD', message, blocking: true }));
/** Deterministic schema-6 compatibility normalization. Legacy zone metadata is discarded. */
export const migrateTemporal = <T extends Partial<Event | PersonEvent>>(record: T): T & Partial<TemporalRecord> => {
 const { timeZone: _timeZone, timeZoneMode: _timeZoneMode, ...local } = record as T & { timeZone?: unknown; timeZoneMode?: unknown };
 const start = local.startTime ?? null, end = local.endTime ?? null;
 const status = local.timeStatus ?? ((local as unknown as Event).eventKind === 'day-type' ? 'all-day' : start && end ? 'timed' : 'unknown');
 return { ...local, startTime: status === 'all-day' || status === 'unknown' ? null : start, endTime: status === 'all-day' || status === 'unknown' ? null : end, endDate: local.endDate ?? local.date ?? null, timeStatus: status } as T & Partial<TemporalRecord>;
};
export const temporalSummary = (e: TemporalRecord) => e.timeStatus === 'all-day' ? 'All day' : e.timeStatus === 'unknown' ? 'Time unknown' : `${e.timeStatus === 'approximate' ? 'Approx. ' : ''}${e.startTime ?? 'Time approximate'}${e.endTime ? `–${e.endTime}` : ''}${e.endDate && e.endDate !== e.date ? ` → ${e.endDate}` : ''}`;
export type TemporalReviewIssue = { key: string; recordType: 'event' | 'person-schedule'; recordId: string; title: string; date: string; code: string; severity: 'blocking'; blocking: true; explanation: string };
export const analyzeTemporalReview = (events: Array<TemporalRecord & { id: string; title: string }>, personEvents: Array<TemporalRecord & { id: string; title: string }>): TemporalReviewIssue[] => [...events.map(x => [x,'event'] as const), ...personEvents.map(x => [x,'person-schedule'] as const)].flatMap(([record, recordType]) => temporalErrors(record).map((explanation, index) => ({ key: `${recordType}:${record.id}:INVALID_TEMPORAL_${index}`, recordType, recordId: record.id, title: record.title, date: record.date, code: 'INVALID_TEMPORAL_COMBINATION', severity: 'blocking' as const, blocking: true as const, explanation })));

/** Compatibility for calendar creation only; no Event calculation reads a browser zone. */
