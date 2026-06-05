import { AppData, Event, Task, Category } from '../types';

const today = () => new Date().toISOString().split('T')[0];
const nextYear = () => new Date().getFullYear() + 1;

// ─── Category color map (used by validation / diff preview fallback) ──────────
export const CATEGORY_COLOR: Record<string, string> = {
  work: '#2563eb', personal: '#7c3aed', health: '#059669',
  travel: '#d97706', family: '#dc2626', other: '#6b7280',
};

const catColorMap = (categories: Category[]): Record<string, string> => {
  const m: Record<string, string> = { ...CATEGORY_COLOR };
  categories.forEach(c => { m[c.id] = c.color; });
  return m;
};

// ─── Concrete schema + example the AI can mirror exactly ─────────────────────
const schemaReference = (categories: Category[]): string => {
  const ids = categories.map(c => c.id);
  const catUnion = ids.map(i => `"${i}"`).join(' | ') || '"other"';
  const colorLines = categories.map(c => `${c.id}=${c.color}`).join('  ');
  const firstCat = ids[0] ?? 'other';
  return `
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
        "category": "${firstCat}",
        "startTime": "09:00",
        "endTime": "10:00",
        "color": "${categories[0]?.color ?? '#6b7280'}",
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
        "category": "${firstCat}",
        "dueDate": "YYYY-MM-DD",
        "status": "todo",
        "owner": "Me",
        "nextAction": "First step",
        "notes": null,
        "schedulingNotes": null,
        "priority": "medium"
      }
    ],
    "update": [],
    "delete": []
  }
}

FIELD RULES — follow exactly:
  date / dueDate : YYYY-MM-DD only (today is ${today()})
  category       : ${catUnion}
  startTime      : "HH:MM" 24-hour, or null
  endTime        : "HH:MM" 24-hour, or null
  status         : "todo" | "in-progress" | "done" | "blocked"
  priority       : "low" | "medium" | "high" | "urgent"
  color          : hex that matches category — ${colorLines}
  owner          : "Me" (default) or another person's name
  schedulingNotes: optional constraints/dependencies text, or null

EXTRA RULES:
  - Use ONLY the category ids listed above. If nothing fits, use "other".
  - To EDIT an existing event/task, put its exact "id" in the "update" array with only the changed fields.
  - To REMOVE an existing event/task, put its exact "id" string in the "delete" array.
  - Omit "update" and "delete" arrays if you have no entries for them
  - If a year is missing from a date, use ${new Date().getFullYear()} (or ${nextYear()} if the date has already passed)
  - Multi-day events: one entry per calendar day
  - Recurring events: expand each occurrence individually for the next 3 months
  - If no tasks are present in the source, omit the "tasks" key entirely
  - Do NOT wrap the JSON in markdown code fences
  - Do NOT include any text before or after the JSON
==================================================
`;
};

// ─── Compact event encoding (collapses repeated titles to cut prompt size) ────
const encodeEventsCompact = (events: Event[]): string => {
  if (events.length === 0) return '  (none)';
  // Group consecutive-by-title to compress recurring events (e.g. ED Shift x17)
  const byTitle = new Map<string, Event[]>();
  events.forEach(e => {
    const arr = byTitle.get(e.title) ?? [];
    arr.push(e);
    byTitle.set(e.title, arr);
  });

  const lines: string[] = [];
  const singles: Event[] = [];
  byTitle.forEach((arr, title) => {
    if (arr.length > 3) {
      const dates = arr.map(e => e.date).sort();
      lines.push(`  ${title} ×${arr.length}  [${arr[0].category}]  (${dates[0]} … ${dates[dates.length - 1]})`);
    } else {
      singles.push(...arr);
    }
  });

  singles
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => {
      lines.push(`  ${e.date}  ${e.startTime ?? '     '}  [${e.category}]  ${e.title}`);
    });

  return lines.sort().join('\n');
};

const encodeEventsDetailed = (events: Event[]): string => {
  if (events.length === 0) return '  (none)';
  return events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    .map(e =>
      `  ${e.date}  ${e.startTime ?? '     '}${e.endTime ? `-${e.endTime}` : ''}  [${e.category}]  ${e.title}` +
      (e.notes ? `  // ${e.notes}` : '')
    )
    .join('\n');
};

const encodeTasks = (tasks: Task[]): string => {
  if (tasks.length === 0) return '  (none)';
  const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  return tasks
    .slice()
    .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))
    .map(t =>
      `  [${t.priority.toUpperCase().padEnd(6)}] ${t.name}` +
      `  due:${t.dueDate ?? 'none'}  status:${t.status}  owner:${t.owner}` +
      (t.nextAction ? `  → ${t.nextAction}` : '') +
      (t.schedulingNotes ? `  ⚙ constraints: ${t.schedulingNotes}` : '')
    )
    .join('\n');
};

// ─── Prompt types & their objective blocks ───────────────────────────────────
export type PromptType =
  | 'analyze' | 'conflicts' | 'freetime' | 'balance' | 'prep' | 'digest';

export const PROMPT_TYPES: { id: PromptType; emoji: string; title: string; description: string }[] = [
  { id: 'analyze',   emoji: '🔍', title: 'Full analysis',        description: 'Conflicts, overloaded days, missing prep, and general improvements.' },
  { id: 'conflicts', emoji: '⚠️', title: 'Find conflicts',        description: 'Double-bookings and overlapping commitments only.' },
  { id: 'freetime',  emoji: '🟢', title: 'Find free time',        description: 'Open slots and gaps where new things could be scheduled.' },
  { id: 'balance',   emoji: '⚖️', title: 'Work–life balance',     description: 'Rest days, overwork streaks, and category balance.' },
  { id: 'prep',      emoji: '🧰', title: 'Add prep & buffers',    description: 'Suggest prep/buffer events before big items and deadlines.' },
  { id: 'digest',    emoji: '📋', title: 'Summary digest',        description: 'A readable rundown of the focus period (few or no changes).' },
];

const OBJECTIVE: Record<PromptType, string> = {
  analyze: `Look for:
1. Scheduling conflicts or double-bookings on the same day
2. Overloaded days or weeks (3+ commitments)
3. Tasks with upcoming due dates that have no calendar time blocked
4. Missing prep events (e.g. no travel booking before a trip)
5. Any other improvements worth suggesting`,
  conflicts: `Focus ONLY on conflicts:
1. Events that overlap in time on the same day
2. Same-day commitments that are physically impossible (e.g. two cities)
3. Tasks due on already-overloaded days
List each conflict clearly, then propose "update"/"delete"/"add" fixes.`,
  freetime: `Focus ONLY on free time:
1. Identify open days and time gaps in the focus period
2. Suggest where unscheduled tasks could be placed
3. Propose "add" events that fill gaps productively (focus blocks, rest, errands)`,
  balance: `Focus on work–life balance:
1. Flag streaks of consecutive work/heavy days with no rest
2. Compare time spent across categories
3. Suggest "add" events for rest, exercise, or family time where lacking`,
  prep: `Focus on preparation & buffers:
1. For each major event/trip/deadline in the focus period, ensure there is prep time before it
2. Propose "add" events for packing, booking, review, travel-to, and recovery buffers
3. Keep prep realistic and tied to a specific source event`,
  digest: `Produce a clear written digest of the focus period:
1. A day-by-day or week-by-week rundown of what's on
2. Highlight the busiest days and the most important items
3. Only propose changes if something is clearly broken — otherwise return empty arrays`,
};

export interface PlanningOptions {
  promptType?: PromptType;
  focusStart?: string | null; // YYYY-MM-DD
  focusEnd?: string | null;   // YYYY-MM-DD
}

// ─── 1. PLANNING PROMPT — analyze schedule, optionally scoped to a date range ─
export const generatePlanningPrompt = (data: AppData, opts: PlanningOptions = {}): string => {
  const { promptType = 'analyze', focusStart, focusEnd } = opts;
  const scoped = !!(focusStart && focusEnd);

  const inFocus = (date: string) => scoped ? (date >= focusStart! && date <= focusEnd!) : true;

  const focusEvents = data.events.filter(e => inFocus(e.date));
  const contextEvents = scoped ? data.events.filter(e => !inFocus(e.date)) : [];

  const peopleLines = data.personEvents
    .filter(p => !scoped || inFocus(p.date))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => `  ${p.date}  [${p.person}]  ${p.title}`)
    .join('\n');

  const focusTasks = scoped
    ? data.tasks.filter(t => !t.dueDate || inFocus(t.dueDate))
    : data.tasks;

  const rangeHeader = scoped
    ? `FOCUS PERIOD: ${focusStart} → ${focusEnd}
Analyze and propose changes ONLY within this period. The rest of the calendar is provided below as CONTEXT so you understand surrounding commitments — do not modify anything outside the focus period.

`
    : '';

  return `Analyze the schedule below and return a JSON object of proposed changes I can import into my scheduling app. Today is ${today()}.

${rangeHeader}${OBJECTIVE[promptType]}

Return your analysis as plain text first, then end with the JSON change set.
Only include items in "add"/"update"/"delete" that you are actually recommending — leave arrays empty or omit them if there is nothing to change.

==================================================
${scoped ? `EVENTS IN FOCUS PERIOD (${focusEvents.length})` : `MY EVENTS (${data.events.length})`}
==================================================
${encodeEventsDetailed(focusEvents)}
${scoped ? `
==================================================
REST OF CALENDAR — CONTEXT ONLY, DO NOT MODIFY (${contextEvents.length})
==================================================
${encodeEventsCompact(contextEvents)}
` : ''}
==================================================
${scoped ? 'TASKS (due in / near focus period)' : 'MY TASKS'} (${focusTasks.length})
==================================================
${encodeTasks(focusTasks)}

==================================================
OTHER PEOPLE'S SCHEDULE
==================================================
${peopleLines || '  (none)'}
${schemaReference(data.categories)}`;
};

// ─── 2. IMPORT PROMPT — convert raw calendar data into app JSON ───────────────
export const generateImportPrompt = (rawInput: string, existingData: AppData): string => {
  const hasExisting = existingData.events.length > 0 || existingData.tasks.length > 0;
  const takenDates  = [...new Set(existingData.events.map(e => e.date))].slice(0, 20).join(', ');
  const catGuide = existingData.categories.map(c => `  "${c.id}" (${c.label})`).join('\n');

  return `Convert the calendar/schedule data below into the exact JSON format specified at the end of this message so it can be imported into a scheduling app.

Source data may be in any format: plain text, iCal/ICS, CSV, a list of appointments, a described weekly routine, or any other structure. Parse every event, appointment, meeting, trip, or task you find.
${hasExisting ? `
IMPORTANT — avoid duplicates:
The app already has events on these dates: ${takenDates || 'none'}
Do not add events that clearly already exist on those dates.
` : ''}
Use ONLY these category ids:
${catGuide}

==================================================
SOURCE SCHEDULE DATA TO CONVERT:
==================================================
${rawInput.trim()}
==================================================
END OF SOURCE DATA
==================================================
${schemaReference(existingData.categories)}`;
};

// ─── 3. ONBOARDING PROMPT — generate a realistic starter schedule ─────────────
export const generateOnboardingPrompt = (data: AppData): string => `Generate a realistic starter schedule and return it as the JSON format specified below so it can be imported into a scheduling app. Today is ${today()}.

Create:
- 15–20 events spread across the next 3 months covering a mix of the available categories
- 6–8 tasks at a mix of priority levels with realistic due dates and next actions
- Include at least: one health appointment, one work review or deadline, one family/social event, one trip or travel day, one personal activity
- Make titles short and realistic (e.g. "Dentist Appt", "Q3 Review", "Flight to Denver")

${schemaReference(data.categories)}`;

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

export const parseAIUpdate = (input: string, categories: Category[]): ParsedUpdate => {
  const raw = input.trim();
  if (!raw) throw new Error('Nothing pasted. Copy the full AI response and paste it here.');

  let s = raw.replace(/^```(?:json|JSON)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();

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
    const fixed = s
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
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

  const colorMap = catColorMap(categories);
  const validCats = new Set(categories.map(c => c.id).concat('other'));

  const result: ParsedUpdate = {};

  if (parsed.events) {
    result.events = {
      add:    normalizeEvents(parsed.events.add ?? [], validCats, colorMap),
      update: Array.isArray(parsed.events.update) ? parsed.events.update : [],
      delete: normalizeIds(parsed.events.delete ?? []),
    };
  }
  if (parsed.tasks) {
    result.tasks = {
      add:    normalizeTasks(parsed.tasks.add ?? [], validCats),
      update: Array.isArray(parsed.tasks.update) ? parsed.tasks.update : [],
      delete: normalizeIds(parsed.tasks.delete ?? []),
    };
  }

  const totalChanges =
    (result.events?.add.length ?? 0) + (result.events?.update.length ?? 0) + (result.events?.delete.length ?? 0) +
    (result.tasks?.add.length ?? 0) + (result.tasks?.update.length ?? 0) + (result.tasks?.delete.length ?? 0);

  if (totalChanges === 0 && !result.events && !result.tasks) {
    throw new Error(
      'The JSON doesn\'t contain "events" or "tasks" keys.\n' +
      'Make sure you used the exact prompt from this app and pasted the complete AI response.'
    );
  }

  return result;
};

// ─── Normalizers ─────────────────────────────────────────────────────────────
const VALID_STA = new Set(['todo', 'in-progress', 'done', 'blocked']);
const VALID_PRI = new Set(['low', 'medium', 'high', 'urgent']);

function normalizeEvents(arr: any[], validCats: Set<string>, colorMap: Record<string, string>): Event[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(e => e && typeof e === 'object')
    .map((e, i) => {
      const cat = validCats.has(e.category) ? e.category : 'other';
      const date = fixDate(e.date ?? '');
      if (!date) return null;
      return {
        id:        String(e.id ?? `imp-evt-${Date.now()}-${i}`),
        date,
        title:     String(e.title ?? 'Untitled'),
        category:  cat,
        startTime: e.startTime ?? null,
        endTime:   e.endTime ?? null,
        color:     e.color ?? colorMap[cat] ?? '#6b7280',
        notes:     e.notes ?? null,
      } as Event;
    })
    .filter(Boolean) as Event[];
}

function normalizeTasks(arr: any[], validCats: Set<string>): Task[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(t => t && typeof t === 'object')
    .map((t, i) => ({
      id:              String(t.id ?? `imp-task-${Date.now()}-${i}`),
      name:            String(t.name ?? 'Untitled Task'),
      category:        validCats.has(t.category) ? t.category : 'other',
      dueDate:         t.dueDate ? fixDate(t.dueDate) : null,
      status:          VALID_STA.has(t.status) ? t.status : 'todo',
      owner:           String(t.owner ?? 'Me'),
      nextAction:      t.nextAction ?? null,
      notes:           t.notes ?? null,
      schedulingNotes: t.schedulingNotes ?? null,
      priority:        VALID_PRI.has(t.priority) ? t.priority : 'medium',
    } as Task));
}

function normalizeIds(arr: any[]): string[] {
  return Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.trim()) : [];
}

function fixDate(raw: string): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`;
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { /* */ }
  return '';
}
