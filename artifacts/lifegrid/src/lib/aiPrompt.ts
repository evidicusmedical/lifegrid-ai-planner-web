import { AppData, Event, Task } from '../types';

const today = () => new Date().toISOString().split('T')[0];
const nextYear = () => new Date().getFullYear() + 1;

// ─── Category color map (used in validation too) ──────────────────────────────
export const CATEGORY_COLOR: Record<string, string> = {
  work:     '#2563eb',
  personal: '#7c3aed',
  health:   '#059669',
  travel:   '#d97706',
  family:   '#dc2626',
  other:    '#6b7280',
};

// ─── Concrete schema + example the AI can mirror exactly ─────────────────────
const schemaReference = () => `
==================================================
OUTPUT FORMAT — return ONLY this JSON, nothing else
==================================================

{
  "events": {
    "add": [
      {
        "id": "evt-001",
        "date": "YYYY-MM-DD",
        "title": "Short event name",
        "category": "work",
        "startTime": "09:00",
        "endTime": "10:00",
        "color": "#2563eb",
        "notes": null
      }
    ],
    "update": [],
    "delete": []
  },
  "tasks": {
    "add": [
      {
        "id": "task-001",
        "name": "Task name",
        "category": "personal",
        "dueDate": "YYYY-MM-DD",
        "status": "todo",
        "owner": "Me",
        "nextAction": "First step",
        "notes": null,
        "priority": "medium"
      }
    ],
    "update": [],
    "delete": []
  }
}

FIELD RULES — follow exactly:
  date / dueDate : YYYY-MM-DD only (today is ${today()})
  category       : "work" | "personal" | "health" | "travel" | "family" | "other"
  startTime      : "HH:MM" 24-hour, or null
  endTime        : "HH:MM" 24-hour, or null
  status         : "todo" | "in-progress" | "done" | "blocked"
  priority       : "low" | "medium" | "high" | "urgent"
  color          : hex that matches category —
                   work=#2563eb  personal=#7c3aed  health=#059669
                   travel=#d97706  family=#dc2626  other=#6b7280
  owner          : "Me" (default) or another person's name

EXTRA RULES:
  - Omit "update" and "delete" arrays if you have no entries for them
  - If a year is missing from a date, use ${new Date().getFullYear()} (or ${nextYear()} if the date has already passed)
  - Multi-day events: one entry per calendar day
  - Recurring events: expand each occurrence individually for the next 3 months
  - If no tasks are present in the source, omit the "tasks" key entirely
  - Do NOT wrap the JSON in markdown code fences
  - Do NOT include any text before or after the JSON
==================================================
`;


// ─── 1. IMPORT PROMPT — convert raw calendar data into app JSON ───────────────
export const generateImportPrompt = (rawInput: string, existingData: AppData): string => {
  const hasExisting = existingData.events.length > 0 || existingData.tasks.length > 0;
  const takenDates  = [...new Set(existingData.events.map(e => e.date))].slice(0, 20).join(', ');

  return `Convert the calendar/schedule data below into the exact JSON format specified at the end of this message so it can be imported into a scheduling app.

Source data may be in any format: plain text, iCal/ICS, CSV, a list of appointments, a described weekly routine, or any other structure. Parse every event, appointment, meeting, trip, or task you find.
${hasExisting ? `
IMPORTANT — avoid duplicates:
The app already has events on these dates: ${takenDates || 'none'}
Do not add events that clearly already exist on those dates.
` : ''}
Category inference guide:
  Doctor / dentist / gym / therapy / prescription → "health"
  Meetings / reviews / conferences / deadlines → "work"
  Flights / hotels / road trips / vacations → "travel"
  Birthdays / dinners / holidays / kids events → "family"
  Hobbies / social / errands / personal appts → "personal"

==================================================
SOURCE SCHEDULE DATA TO CONVERT:
==================================================
${rawInput.trim()}
==================================================
END OF SOURCE DATA
==================================================
${schemaReference()}`;
};


// ─── 2. PLANNING PROMPT — analyze existing schedule, suggest changes ──────────
export const generatePlanningPrompt = (data: AppData): string => {
  const evtLines = data.events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e =>
      `  ${e.date}  ${e.startTime ?? '     '}  [${e.category}]  ${e.title}` +
      (e.notes ? `  // ${e.notes}` : '')
    ).join('\n');

  const taskLines = data.tasks
    .slice()
    .sort((a, b) => {
      const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    })
    .map(t =>
      `  [${t.priority.toUpperCase().padEnd(6)}] ${t.name}` +
      `  due:${t.dueDate ?? 'none'}  status:${t.status}  owner:${t.owner}` +
      (t.nextAction ? `  → ${t.nextAction}` : '')
    ).join('\n');

  const peopleLines = data.personEvents
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => `  ${p.date}  [${p.person === 'wife' ? 'Wife  ' : 'Shared'}]  ${p.title}`)
    .join('\n');

  return `Analyze the schedule below and return a JSON object of proposed changes I can import into my scheduling app. Today is ${today()}.

Look for:
1. Scheduling conflicts or double-bookings on the same day
2. Overloaded days or weeks (3+ events)
3. Tasks with upcoming due dates that have no corresponding calendar event blocked
4. Missing prep events (e.g. no travel booking before a trip)
5. Any other improvements worth suggesting

Return your analysis as plain text first, then end with the JSON change set.
Only include items in "add"/"update"/"delete" that you are actually recommending — leave arrays empty or omit them if there is nothing to change.

==================================================
MY EVENTS (${data.events.length})
==================================================
${evtLines || '  (none)'}

==================================================
MY TASKS (${data.tasks.length})
==================================================
${taskLines || '  (none)'}

==================================================
WIFE / SHARED SCHEDULE
==================================================
${peopleLines || '  (none)'}
${schemaReference()}`;
};


// ─── 3. ONBOARDING PROMPT — generate a realistic starter schedule ─────────────
export const generateOnboardingPrompt = (): string => `Generate a realistic starter schedule for a busy professional with a family and return it as the JSON format specified below so it can be imported into a scheduling app. Today is ${today()}.

Create:
- 15–20 events spread across the next 3 months covering work, health, family, travel, and personal categories
- 6–8 tasks at a mix of priority levels with realistic due dates and next actions
- Include at least: one health appointment, one work review or deadline, one family event, one trip or travel day, one personal activity
- Make titles short and realistic (e.g. "Dentist Appt", "Q3 Review", "Flight to Denver")

${schemaReference()}`;


// ─── Robust parser ────────────────────────────────────────────────────────────
export interface ParsedUpdate {
  events?: {
    add:    Event[];
    update: Array<{ id: string } & Partial<Event>>;
    delete: string[];
  };
  tasks?: {
    add:    Task[];
    update: Array<{ id: string } & Partial<Task>>;
    delete: string[];
  };
}

export const parseAIUpdate = (input: string): ParsedUpdate => {
  const raw = input.trim();
  if (!raw) throw new Error('Nothing pasted. Copy the full AI response and paste it here.');

  // Strip markdown fences (```json ... ``` or ``` ... ```)
  let s = raw.replace(/^```(?:json|JSON)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();

  // If analysis text precedes the JSON, extract from first { to last }
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start < 0 || end < 0) {
    throw new Error(
      'No JSON object found in the response.\n\n' +
      'Make sure you copied the entire AI response. ' +
      'The AI should have returned a { ... } JSON block.'
    );
  }
  s = s.slice(start, end + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(s);
  } catch {
    // Fix common AI mistakes: trailing commas, single quotes
    const fixed = s
      .replace(/,\s*([}\]])/g, '$1')   // trailing commas
      .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');  // single-quoted keys
    try {
      parsed = JSON.parse(fixed);
    } catch (e2: any) {
      throw new Error(
        `Could not parse the JSON. Common causes:\n` +
        `• Copied only part of the response — paste the full output\n` +
        `• AI returned garbled text — try asking it again\n\n` +
        `Parser detail: ${e2.message}`
      );
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object { "events": ..., "tasks": ... } but got something else.');
  }

  const result: ParsedUpdate = {};

  if (parsed.events) {
    result.events = {
      add:    normalizeEvents(parsed.events.add    ?? []),
      update: Array.isArray(parsed.events.update) ? parsed.events.update : [],
      delete: normalizeIds(parsed.events.delete   ?? []),
    };
  }
  if (parsed.tasks) {
    result.tasks = {
      add:    normalizeTasks(parsed.tasks.add    ?? []),
      update: Array.isArray(parsed.tasks.update) ? parsed.tasks.update : [],
      delete: normalizeIds(parsed.tasks.delete   ?? []),
    };
  }

  const totalChanges =
    (result.events?.add.length    ?? 0) + (result.events?.update.length ?? 0) + (result.events?.delete.length ?? 0) +
    (result.tasks?.add.length     ?? 0) + (result.tasks?.update.length  ?? 0) + (result.tasks?.delete.length  ?? 0);

  if (totalChanges === 0 && !result.events && !result.tasks) {
    throw new Error(
      'The JSON doesn\'t contain "events" or "tasks" keys.\n' +
      'Make sure you used the exact prompt from this app and pasted the complete AI response.'
    );
  }

  return result;
};

// ─── Normalizers ─────────────────────────────────────────────────────────────
const VALID_CAT  = new Set(['work','personal','health','travel','family','other']);
const VALID_STA  = new Set(['todo','in-progress','done','blocked']);
const VALID_PRI  = new Set(['low','medium','high','urgent']);

function normalizeEvents(arr: any[]): Event[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(e => e && typeof e === 'object')
    .map((e, i) => {
      const cat = VALID_CAT.has(e.category) ? e.category : 'other';
      const date = fixDate(e.date ?? '');
      if (!date) return null;
      return {
        id:        String(e.id ?? `imp-evt-${Date.now()}-${i}`),
        date,
        title:     String(e.title ?? 'Untitled'),
        category:  cat,
        startTime: e.startTime ?? null,
        endTime:   e.endTime   ?? null,
        color:     e.color     ?? CATEGORY_COLOR[cat],
        notes:     e.notes     ?? null,
      } as Event;
    })
    .filter(Boolean) as Event[];
}

function normalizeTasks(arr: any[]): Task[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(t => t && typeof t === 'object')
    .map((t, i) => ({
      id:         String(t.id ?? `imp-task-${Date.now()}-${i}`),
      name:       String(t.name ?? 'Untitled Task'),
      category:   VALID_CAT.has(t.category)  ? t.category  : 'other',
      dueDate:    t.dueDate  ? fixDate(t.dueDate) : null,
      status:     VALID_STA.has(t.status)    ? t.status    : 'todo',
      owner:      String(t.owner ?? 'Me'),
      nextAction: t.nextAction ?? null,
      notes:      t.notes      ?? null,
      priority:   VALID_PRI.has(t.priority)  ? t.priority  : 'medium',
    } as Task));
}

function normalizeIds(arr: any[]): string[] {
  return Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.trim()) : [];
}

function fixDate(raw: string): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`;
  // MM/DD/YY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
  // Fallback: JS Date
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { /* */ }
  return '';
}
