import { AppData, Event, Task } from '../types';

// ─── Shared schema block ───────────────────────────────────────────────────────
const SCHEMA_BLOCK = `
=== APP JSON SCHEMA ===

Return ONLY a valid JSON object (no prose, no markdown fences) matching this exact structure:

{
  "events": {
    "add":    [ ...Event ],
    "update": [ ...{ id: string, ...partial Event fields } ],
    "delete": [ ..."event-id-string" ]
  },
  "tasks": {
    "add":    [ ...Task ],
    "update": [ ...{ id: string, ...partial Task fields } ],
    "delete": [ ..."task-id-string" ]
  }
}

EVENT FIELDS (all required unless marked optional):
  id         : string — generate a new UUID like "evt-001", "evt-002"...
  date       : string — "YYYY-MM-DD" format
  title      : string — short, human-readable event name
  category   : string — MUST be one of: "work" | "personal" | "health" | "travel" | "family" | "other"
  startTime  : string | null — "HH:MM" 24-hour format, or null
  endTime    : string | null — "HH:MM" 24-hour format, or null
  color      : string — hex color matching category:
                 work="#2563eb"  personal="#7c3aed"  health="#059669"
                 travel="#d97706"  family="#dc2626"  other="#6b7280"
  notes      : string | null — any extra details

TASK FIELDS (all required unless marked optional):
  id         : string — generate a new UUID like "task-001", "task-002"...
  name       : string — task name
  category   : string — MUST be one of: "work" | "personal" | "health" | "travel" | "family" | "other"
  dueDate    : string | null — "YYYY-MM-DD" or null
  status     : string — MUST be one of: "todo" | "in-progress" | "done" | "blocked"
  owner      : string — person responsible, e.g. "Me" or "Wife"
  nextAction : string | null — immediate next step
  notes      : string | null — extra context
  priority   : string — MUST be one of: "low" | "medium" | "high" | "urgent"

RULES:
- Omit any array you have no changes for (e.g., omit "update" if you have no updates)
- Never include IDs in "add" arrays that already exist in the current data
- For "update", include ONLY the fields that should change, plus the id
- Dates MUST be YYYY-MM-DD. Do NOT use MM/DD/YYYY or other formats
- Assign colors that match the category (see table above)
- If a recurring event spans multiple days, create one entry per day
- Today's date is: ${new Date().toISOString().split('T')[0]}

=== END SCHEMA ===`;


// ─── 1. Planning prompt (existing data → AI optimizations) ────────────────────
export const generatePlanningPrompt = (data: AppData): string => {
  const today = new Date().toISOString().split('T')[0];

  const eventLines = data.events
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => `  ${e.date} | ${e.title} | ${e.category}${e.startTime ? ' @ ' + e.startTime : ''}${e.notes ? ' — ' + e.notes : ''}`)
    .join('\n');

  const taskLines = data.tasks
    .sort((a, b) => { const p = { urgent: 0, high: 1, medium: 2, low: 3 }; return (p[a.priority as keyof typeof p] ?? 9) - (p[b.priority as keyof typeof p] ?? 9); })
    .map(t => `  [${t.priority.toUpperCase()}] ${t.name} | due: ${t.dueDate ?? 'none'} | status: ${t.status} | owner: ${t.owner}${t.nextAction ? ' | next: ' + t.nextAction : ''}`)
    .join('\n');

  const peopleLines = data.personEvents
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => `  ${p.date} | ${p.person === 'wife' ? "Wife" : "Shared"}: ${p.title}`)
    .join('\n');

  return `You are my AI life planner and schedule optimizer. Today is ${today}.

Below is my complete current schedule. Please:
1. Identify any scheduling conflicts or double-bookings
2. Flag overloaded weeks or days (3+ events)
3. Suggest tasks that need immediate attention based on due dates
4. Identify any prep tasks I might be missing (e.g., booking travel before a trip)
5. Propose any changes as a JSON response I can import back into my planner

=== MY CURRENT EVENTS (${data.events.length} total) ===
${eventLines || '  (none yet)'}

=== MY CURRENT TASKS (${data.tasks.length} total) ===
${taskLines || '  (none yet)'}

=== WIFE / SHARED SCHEDULE ===
${peopleLines || '  (none yet)'}

${SCHEMA_BLOCK}

After your analysis text, output the JSON on its own with no surrounding text.`;
};


// ─── 2. Import prompt (paste raw calendar → AI parses into schema) ─────────────
export const generateImportPrompt = (rawInput: string, existingData: AppData): string => {
  const today = new Date().toISOString().split('T')[0];
  const hasExisting = existingData.events.length > 0 || existingData.tasks.length > 0;

  const existingEventIds = existingData.events.map(e => e.id);
  const existingDates = existingData.events.map(e => e.date);

  return `You are a calendar parsing assistant. Today is ${today}.

Your job is to read the raw calendar/schedule data I paste below — in ANY format (iCal/ICS, plain English, CSV, Google Calendar export, Outlook export, a list of appointments, a weekly schedule description, etc.) — and convert it into structured JSON my LifeGrid planner app can import.

=== RAW CALENDAR INPUT (parse everything below this line) ===
${rawInput.trim()}
=== END RAW INPUT ===

${hasExisting ? `=== EXISTING DATA TO PRESERVE ===
The app already has ${existingData.events.length} events. Do NOT duplicate events that appear to already exist.
Existing event dates: ${[...new Set(existingDates)].join(', ')}
Existing event IDs (never reuse): ${existingEventIds.slice(0, 10).join(', ')}${existingEventIds.length > 10 ? ` ... and ${existingEventIds.length - 10} more` : ''}
===

` : ''}INSTRUCTIONS:
1. Parse EVERY event, appointment, meeting, trip, or schedule item from the raw input above
2. Convert each to the Event schema below — infer category, color, and times where possible
3. If the input contains tasks, to-dos, or action items — add them to the tasks array
4. If years are missing from dates, assume ${new Date().getFullYear()} (or ${new Date().getFullYear() + 1} for dates in the past)
5. For recurring events (e.g. "every Monday"), create individual entries for each occurrence for the next 3 months
6. Infer categories intelligently:
   - Doctor/dentist/gym/health → "health"
   - Work meetings/reviews/travel for work → "work"  
   - Family dinners/birthdays/holidays → "family"
   - Flights/trips/vacations → "travel"
   - Hobbies/social/personal → "personal"
7. Return ONLY the JSON — no explanation text before or after

${SCHEMA_BLOCK}`;
};


// ─── 3. Blank-slate onboarding prompt (no existing data) ─────────────────────
export const generateOnboardingPrompt = (): string => {
  const today = new Date().toISOString().split('T')[0];
  return `You are my AI life planner. Today is ${today}. I'm setting up a new personal schedule planner called LifeGrid.

I don't have any existing data yet. Please help me create a starter schedule by:
1. Creating a set of common personal + work events for the next 3 months as examples
2. Creating 5–8 starter tasks across different priority levels
3. Covering categories: work, personal, health, travel, and family

Make the events realistic for a busy professional with a family. Include:
- Regular health appointments (dentist, physical, etc.)
- Work milestones and reviews
- Family events and holidays
- A travel trip
- A few personal activities

${SCHEMA_BLOCK}`;
};


// ─── Robust parser: handles markdown fences, partial JSON, edge cases ─────────
export const parseAIUpdate = (input: string): ParsedUpdate => {
  const raw = input.trim();
  if (!raw) throw new Error('No content pasted. Please paste the AI response.');

  // 1. Strip markdown code fences  ```json ... ``` or ``` ... ```
  let cleaned = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  // 2. If text precedes the JSON, find the first { and slice from there
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) {
    cleaned = cleaned.slice(jsonStart);
  }

  // 3. If text follows the JSON, find the last } and slice
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonEnd >= 0 && jsonEnd < cleaned.length - 1) {
    cleaned = cleaned.slice(0, jsonEnd + 1);
  }

  // 4. Try parsing
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 5. Try removing trailing commas (common AI mistake)
    const fixed = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,])\s*,/g, '$1');
    try {
      parsed = JSON.parse(fixed);
    } catch (e2: any) {
      throw new Error(`Could not parse JSON. Make sure you copied the full AI response.\n\nParser error: ${e2.message}`);
    }
  }

  // 6. Validate structure
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Response is not a JSON object. Expected { "events": {...}, "tasks": {...} }');
  }

  const result: ParsedUpdate = {};

  if (parsed.events) {
    result.events = {
      add:    validateEventArray(parsed.events.add    ?? []),
      update: parsed.events.update ?? [],
      delete: validateIdArray(parsed.events.delete    ?? []),
    };
  }

  if (parsed.tasks) {
    result.tasks = {
      add:    validateTaskArray(parsed.tasks.add    ?? []),
      update: parsed.tasks.update ?? [],
      delete: validateIdArray(parsed.tasks.delete  ?? []),
    };
  }

  if (!result.events && !result.tasks) {
    throw new Error('No "events" or "tasks" keys found in the response. Make sure the AI returned the correct format.');
  }

  return result;
};

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

// ─── Validation helpers ────────────────────────────────────────────────────────
const VALID_CATEGORIES = ['work', 'personal', 'health', 'travel', 'family', 'other'];
const VALID_STATUS     = ['todo', 'in-progress', 'done', 'blocked'];
const VALID_PRIORITY   = ['low', 'medium', 'high', 'urgent'];
const CATEGORY_COLOR: Record<string, string> = {
  work: '#2563eb', personal: '#7c3aed', health: '#059669',
  travel: '#d97706', family: '#dc2626', other: '#6b7280',
};

function validateEventArray(arr: any[]): Event[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(e => e && typeof e === 'object')
    .map((e, i) => {
      const category = VALID_CATEGORIES.includes(e.category) ? e.category : 'other';
      return {
        id:        e.id        ?? `imported-evt-${Date.now()}-${i}`,
        date:      normalizeDate(e.date ?? ''),
        title:     String(e.title ?? 'Untitled Event'),
        category,
        startTime: e.startTime ?? null,
        endTime:   e.endTime   ?? null,
        color:     e.color     ?? CATEGORY_COLOR[category],
        notes:     e.notes     ?? null,
      } as Event;
    })
    .filter(e => e.date);  // drop events with no valid date
}

function validateTaskArray(arr: any[]): Task[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(t => t && typeof t === 'object')
    .map((t, i) => ({
      id:         t.id         ?? `imported-task-${Date.now()}-${i}`,
      name:       String(t.name ?? 'Untitled Task'),
      category:   VALID_CATEGORIES.includes(t.category) ? t.category : 'other',
      dueDate:    t.dueDate    ? normalizeDate(t.dueDate) : null,
      status:     VALID_STATUS.includes(t.status)     ? t.status     : 'todo',
      owner:      String(t.owner ?? 'Me'),
      nextAction: t.nextAction ?? null,
      notes:      t.notes      ?? null,
      priority:   VALID_PRIORITY.includes(t.priority) ? t.priority   : 'medium',
    } as Task));
}

function validateIdArray(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(id => typeof id === 'string' && id.trim());
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
  // MM/DD/YY
  const mdy2 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdy2) return `20${mdy2[3]}-${mdy2[1].padStart(2,'0')}-${mdy2[2].padStart(2,'0')}`;
  // Try JS Date parse as fallback
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch { /* */ }
  return '';
}
