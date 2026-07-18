import type { AppData, Event } from '../types';

export type IcsOptions = { includeApproximate?: boolean; includeUnknown?: boolean; timeMode?: 'preserve' | 'utc'; now?: Date };
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
/** RFC 5545 content lines must not exceed 75 octets. Iteration is by code point. */
export const foldIcsLine = (line: string): string[] => { const encoder = new TextEncoder(); const chunks: string[] = []; let chunk = '', bytes = 0; for (const char of line) { const size = encoder.encode(char).length; if (bytes + size > 75 && chunk) { chunks.push(chunk); chunk = ` ${char}`; bytes = size + 1; } else { chunk += char; bytes += size; } } if (chunk) chunks.push(chunk); return chunks; };
const icsStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const dayAfter = (date: string) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ''); };

/** Pure ICS serializer shared by Settings and executable tests. VTIMEZONE is intentionally not emitted. */
export const buildIcsExport = (app: Pick<AppData, 'categories'>, events: Event[], options: IcsOptions = {}): string => {
 const stamp = icsStamp(options.now ?? new Date()); const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LifeGrid AI Planner//EN', 'CALSCALE:GREGORIAN'];
 events.slice().sort((a,b) => a.date.localeCompare(b.date)).forEach(e => {
  const date = e.date.replace(/-/g, ''), endDate = (e.endDate || e.date).replace(/-/g, ''); lines.push('BEGIN:VEVENT', `UID:${e.id}@lifegrid`, `DTSTAMP:${stamp}`);
  if (e.timeStatus === 'all-day' || e.timeStatus === 'unknown' || !e.startTime || !e.endTime) lines.push(`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${dayAfter(e.endDate || e.date)}`);
  else { const st = `${date}T${e.startTime.replace(':','')}00`, en = `${endDate}T${e.endTime.replace(':','')}00`; lines.push(`DTSTART:${st}`, `DTEND:${en}`); }
  lines.push(`SUMMARY:${escape(e.title)}`); if (e.timeStatus === 'approximate') lines.push('X-LIFEGRID-APPROXIMATE:TRUE', 'DESCRIPTION:LifeGrid status: Approximate time.'); if (e.timeStatus === 'unknown') lines.push('X-LIFEGRID-TIME-UNKNOWN:TRUE', 'DESCRIPTION:LifeGrid status: Time unknown. This all-day calendar representation does not mean the record occupies the full day.'); const cat = app.categories.find(c => c.id === e.category)?.label ?? e.category; lines.push(`CATEGORIES:${escape(cat)}`); if (e.notes) lines.push(`DESCRIPTION:${escape(e.notes)}`); lines.push('END:VEVENT');
 }); lines.push('END:VCALENDAR'); return lines.flatMap(foldIcsLine).join('\r\n') + '\r\n';
};
