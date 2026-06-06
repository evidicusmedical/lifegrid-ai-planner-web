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
  | 'analyze' | 'conflicts' | 'freetime' | 'balance' | 'prep' | 'digest'
  | 'compact' | 'tasks-only' | 'availability';

export const PROMPT_TYPES: { id: PromptType; emoji: string; title: string; description: string; badge?: string }[] = [
  { id: 'analyze',      emoji: '🔍', title: 'Full analysis',        description: 'Conflicts, overloaded days, missing prep, and general improvements.' },
  { id: 'conflicts',    emoji: '⚠️', title: 'Find conflicts',        description: 'Double-bookings and overlapping commitments only.' },
  { id: 'freetime',     emoji: '🟢', title: 'Find free time',        description: 'Open slots and gaps where new things could be scheduled.' },
  { id: 'balance',      emoji: '⚖️', title: 'Work–life balance',     description: 'Rest days, overwork streaks, and category balance.' },
  { id: 'prep',         emoji: '🧰', title: 'Add prep & buffers',    description: 'Suggest prep/buffer events before big items and deadlines.' },
  { id: 'digest',       emoji: '📋', title: 'Summary digest',        description: 'A readable rundown of the focus period (few or no changes).' },
  { id: 'compact',      emoji: '⚡', title: 'Quick update',          description: 'Next 14 days + overdue/high-priority tasks only — smallest prompt.', badge: 'Fast' },
  { id: 'tasks-only',   emoji: '✅', title: 'Tasks only',            description: 'Focuses entirely on your task list — scheduling, priorities, next actions.', badge: 'Focused' },
  { id: 'availability', emoji: '📅', title: 'Availability planner',  description: 'Shows your schedule; asks AI to find free slots for you to use.', badge: 'Focused' },
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
  compact: `Quick schedule health-check for the next 14 days + urgent/overdue tasks:
1. Flag any obvious conflicts or critical gaps
2. Suggest prep for any upcoming deadlines
3. Keep your response SHORT — bullet points, then the JSON`,
  'tasks-only': `Focus entirely on the task list:
1. Which tasks are overdue or at risk of becoming overdue?
2. Are priorities correctly set? Suggest changes where needed
3. For each high/urgent task, ensure there is a clear next action
4. Suggest scheduling blocks (calendar events) for tasks that need focus time
5. Propose any task status updates (e.g. blocked → needs a next action)`,
  availability: `Find free time and plan when things can be done:
1. Identify open days and blocks of time in the schedule
2. Match each pending/incomplete task to a realistic time slot
3. Suggest "add" events as focus blocks or appointments
4. Keep suggestions practical — don't overschedule`,
};

export interface PlanningOptions {
  promptType?: PromptType;
  focusStart?: string | null; // YYYY-MM-DD
  focusEnd?: string | null;   // YYYY-MM-DD
}

// ─── 1. PLANNING PROMPT — analyze schedule, optionally scoped to a date range ─
export const generatePlanningPrompt = (data: AppData, opts: PlanningOptions = {}): string => {
  const { promptType = 'analyze', focusStart, focusEnd } = opts;

  // ── Compact mode: hard-coded 14-day window + slim task set ──
  if (promptType === 'compact') {
    const t = today();
    const end14 = new Date(); end14.setDate(end14.getDate() + 14);
    const end14Str = end14.toISOString().split('T')[0];
    const windowEvents = data.events.filter(e => e.date >= t && e.date <= end14Str);
    const urgentTasks = data.tasks.filter(t =>
      t.status !== 'done' &&
      (t.priority === 'urgent' || t.priority === 'high' || (t.dueDate && t.dueDate <= end14Str))
    );
    return `Analyze my schedule for the next 14 days (${t} → ${end14Str}) and give me a quick health-check. Today is ${t}.

${OBJECTIVE['compact']}

==================================================
EVENTS — next 14 days (${windowEvents.length})
==================================================
${encodeEventsDetailed(windowEvents)}

==================================================
TASKS — overdue, high-priority, or due within 14 days (${urgentTasks.length})
==================================================
${encodeTasks(urgentTasks)}
${schemaReference(data.categories)}`;
  }

  // ── Tasks-only mode ──
  if (promptType === 'tasks-only') {
    const incompleteTasks = data.tasks.filter(t => t.status !== 'done');
    return `Analyze my task list and help me prioritize and schedule them. Today is ${today()}.

${OBJECTIVE['tasks-only']}

Return your analysis as plain text, then end with the JSON change set.
Only include items in add/update/delete that you are actually recommending.

==================================================
MY TASKS (${incompleteTasks.length} incomplete, ${data.tasks.length} total)
==================================================
${encodeTasks(incompleteTasks)}
${schemaReference(data.categories)}`;
  }

  // ── Availability mode ──
  if (promptType === 'availability') {
    const scoped = !!(focusStart && focusEnd);
    const inFocus = (date: string) => scoped ? (date >= focusStart! && date <= focusEnd!) : true;
    const windowEvents = data.events.filter(e => inFocus(e.date));
    const pendingTasks = data.tasks.filter(t => t.status !== 'done');
    return `Here is my calendar${scoped ? ` for ${focusStart} → ${focusEnd}` : ''}. Today is ${today()}.

${OBJECTIVE['availability']}

Return your analysis as plain text (which slots are free, what you'd put where), then end with the JSON change set for any scheduling blocks you want to add.

==================================================
MY SCHEDULE${scoped ? ` (${focusStart} → ${focusEnd})` : ''} — ${windowEvents.length} events
==================================================
${encodeEventsDetailed(windowEvents)}

==================================================
PENDING TASKS — ${pendingTasks.length}
==================================================
${encodeTasks(pendingTasks)}
${schemaReference(data.categories)}`;
  }

  // ── Standard modes (analyze, conflicts, freetime, balance, prep, digest) ──
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

// ─── 2b. IMAGE IMPORT PROMPT — read attached photos/screenshots into app JSON ─
export const generateImagePrompt = (existingData: AppData): string => {
  const hasExisting = existingData.events.length > 0 || existingData.tasks.length > 0;
  const takenDates  = [...new Set(existingData.events.map(e => e.date))].slice(0, 20).join(', ');
  const catGuide = existingData.categories.map(c => `  "${c.id}" (${c.label})`).join('\n');

  return `I am going to ATTACH one or more images to this chat — screenshots or photos of my schedule (phone calendar screenshots, a photo of a paper planner, a printed timetable, a whiteboard, an email, etc.).

Carefully read EVERY image I attach. Extract every event, appointment, meeting, class, shift, trip, and task you can see — including the date, day of week, start/end times, and titles. If a time or date is partially visible or ambiguous, make your best reasonable guess and add to that item's "notes" field: "⚠️ REVIEW: [describe what was unclear]" — so the user can quickly spot and correct those entries.

Then return the result in the exact JSON format specified at the end of this message so it can be imported into a scheduling app. Today is ${today()}.
${hasExisting ? `
IMPORTANT — avoid duplicates:
The app already has events on these dates: ${takenDates || 'none'}
Do not add events that clearly already exist on those dates.
` : ''}
Use ONLY these category ids:
${catGuide}

⬇️ After you read this message, I will attach the image(s). Wait for them, read them, then reply with ONLY the JSON.
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
  warnings?: string[];
}

// Find the closing brace that matches the opening brace at `start`.
function findMatchingBrace(s: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

export const parseAIUpdate = (input: string, categories: Category[], existingData?: AppData): ParsedUpdate => {
  const raw = input.trim();
  if (!raw) throw new Error('Nothing pasted. Copy the full AI response and paste it here.');

  let s = raw
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/```(?:json|JSON)?\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const dataKeyMatch = s.match(/\{\s*"(?:events|tasks)"/);
  const start = dataKeyMatch?.index ?? s.indexOf('{');

  if (start < 0) {
    throw new Error(
      'No JSON found in the response.\n\n' +
      'Make sure you copied the ENTIRE AI reply — the JSON block at the end ' +
      'is what the app needs. If the AI only gave analysis text with no JSON, ' +
      'ask it: "Now return just the JSON change set."'
    );
  }

  let end = findMatchingBrace(s, start);
  if (end < 0) end = s.lastIndexOf('}');
  if (end < start) {
    throw new Error(
      'The JSON block appears to be cut off. Make sure you copied the full response, ' +
      'including the final closing }.'
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
        `The JSON could not be parsed.\n\n` +
        `Common fixes:\n` +
        `• Paste the FULL AI response, not just part of it\n` +
        `• If it still fails, ask the AI: "Return only the raw JSON, no extra text"\n\n` +
        `Technical detail: ${e2.message}`
      );
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object { "events": ..., "tasks": ... } but got something else.');
  }

  const colorMap = catColorMap(categories);
  const validCats = new Set(categories.map(c => c.id).concat('other'));

  // Build ID sets for unknown-ID warnings
  const existingEventIds = new Set(existingData?.events.map(e => e.id) ?? []);
  const existingTaskIds  = new Set(existingData?.tasks.map(t => t.id) ?? []);
  const warnings: string[] = [];

  const result: ParsedUpdate = {};

  if (parsed.events) {
    const updateArr = Array.isArray(parsed.events.update) ? parsed.events.update : [];
    const deleteArr = normalizeIds(parsed.events.delete ?? []);
    // Warn on unknown update/delete IDs
    if (existingData) {
      updateArr.forEach((u: any) => {
        if (u?.id && !existingEventIds.has(u.id)) {
          warnings.push(`Event update ID not found: "${u.id}" — may be a new or incorrect ID`);
        }
      });
      deleteArr.forEach((id: string) => {
        if (!existingEventIds.has(id)) {
          warnings.push(`Event delete ID not found: "${id}"`);
        }
      });
    }
    result.events = {
      add:    normalizeEvents(parsed.events.add ?? [], validCats, colorMap),
      update: updateArr
        .filter((u: any) => u && typeof u.id === 'string')
        .map((u: any) => normalizeEventUpdate(u, validCats, colorMap)),
      delete: deleteArr,
    };
  }
  if (parsed.tasks) {
    const updateArr = Array.isArray(parsed.tasks.update) ? parsed.tasks.update : [];
    const deleteArr = normalizeIds(parsed.tasks.delete ?? []);
    if (existingData) {
      updateArr.forEach((u: any) => {
        if (u?.id && !existingTaskIds.has(u.id)) {
          warnings.push(`Task update ID not found: "${u.id}" — may be a new or incorrect ID`);
        }
      });
      deleteArr.forEach((id: string) => {
        if (!existingTaskIds.has(id)) {
          warnings.push(`Task delete ID not found: "${id}"`);
        }
      });
    }
    result.tasks = {
      add:    normalizeTasks(parsed.tasks.add ?? [], validCats),
      update: updateArr
        .filter((u: any) => u && typeof u.id === 'string')
        .map((u: any) => normalizeTaskUpdate(u, validCats)),
      delete: deleteArr,
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

  if (warnings.length > 0) result.warnings = warnings;
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
        startTime: fixTime(e.startTime),
        endTime:   fixTime(e.endTime),
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

function normalizeEventUpdate(
  u: any, validCats: Set<string>, colorMap: Record<string, string>
): { id: string } & Partial<Event> {
  const out: any = { id: String(u.id) };
  if (u.date     !== undefined) { const d = fixDate(String(u.date)); if (d) out.date = d; }
  if (u.title    !== undefined) out.title = String(u.title);
  if (u.category !== undefined) out.category = validCats.has(u.category) ? u.category : 'other';
  if (u.color    !== undefined) out.color = String(u.color);
  if ('startTime' in u) out.startTime = fixTime(u.startTime);
  if ('endTime'   in u) out.endTime   = fixTime(u.endTime);
  if ('notes'     in u) out.notes = u.notes ?? null;
  if (out.category && !out.color) out.color = colorMap[out.category];
  return out;
}

function normalizeTaskUpdate(u: any, validCats: Set<string>): { id: string } & Partial<Task> {
  const out: any = { id: String(u.id) };
  if (u.name     !== undefined) out.name = String(u.name);
  if (u.category !== undefined) out.category = validCats.has(u.category) ? u.category : 'other';
  if (u.dueDate  !== undefined) { const d = fixDate(String(u.dueDate)); if (d) out.dueDate = d; }
  if (u.status   !== undefined && VALID_STA.has(u.status))  out.status   = u.status;
  if (u.priority !== undefined && VALID_PRI.has(u.priority)) out.priority = u.priority;
  if ('notes'          in u) out.notes          = u.notes ?? null;
  if ('nextAction'     in u) out.nextAction     = u.nextAction ?? null;
  if ('schedulingNotes' in u) out.schedulingNotes = u.schedulingNotes ?? null;
  if ('owner'          in u) out.owner          = String(u.owner ?? 'Me');
  return out;
}

// ─── Date / time helpers ──────────────────────────────────────────────────────
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLASH_DATE_RE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;

function fixDate(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (ISO_DATE_RE.test(s)) return s;
  const slash = s.match(SLASH_DATE_RE);
  if (slash) {
    const [, m, d, y] = slash;
    const year = y
      ? (y.length === 2 ? `20${y}` : y)
      : String(new Date().getFullYear());
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  } catch { /* ignore */ }
  return null;
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
function fixTime(raw: any): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (TIME_RE.test(s)) return s;
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return null;
}

// ─── Token / size estimate (rough: 1 token ≈ 4 chars) ────────────────────────
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
export const COMPACT_THRESHOLD_TOKENS = 3000;
