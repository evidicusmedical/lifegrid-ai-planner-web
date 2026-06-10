import { AppData, Event, Task, Category, Project, ProjectStatus, EventDisplayPriority, EventKind, TaskDueDateType, TaskTriageStatus } from '../types';

const today = () => new Date().toISOString().split('T')[0];
const nextYear = () => new Date().getFullYear() + 1;

const EVENT_KIND_VALUES = [
  'fixed-appointment',
  'shift',
  'travel',
  'day-type',
  'flexible-work-block',
  'reminder',
  'placeholder',
  'protected-time',
] as const;
const EVENT_KIND_SET = new Set<EventKind>(EVENT_KIND_VALUES);
const EVENT_KIND_RULE = EVENT_KIND_VALUES.map(k => `"${k}"`).join(' | ');

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

const encodeCategoryOrder = (data: AppData): string =>
  data.categories.map((c, i) => `  ${i + 1}. ${c.id} (${c.label}, ${c.color})`).join('\n') || '  (none)';

const projectExportObjects = (data: AppData) =>
  data.projects
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
    .map(p => {
      const linked = data.tasks.filter(t => t.projectId === p.id);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        order: p.order ?? 0,
        aliases: p.aliases ?? [],
        status: p.status ?? 'active',
        notes: p.notes ?? null,
        taskCount: linked.length,
        completedTaskCount: linked.filter(t => t.status === 'done').length,
      };
    });

const encodeProjects = (data: AppData): string => {
  const projects = projectExportObjects(data);
  if (projects.length === 0) return '  (none)';
  return JSON.stringify(projects, null, 2);
};

const aiReviewInstructions = (): string => `
AI REVIEW INSTRUCTIONS
- Role: LifeGrid Admin Assistant.
- Preserve existing commitments unless explicitly asked to change them.
- Flag ambiguity in notes or warnings instead of guessing.
- Only output changed, new, or deleted items; do not return the full unchanged dataset.
- Do not delete items without stable IDs.
- Respect dueDateType: real-deadline tasks are fixed unless I explicitly approve a move; target-date tasks are movable if overloaded; someday-backlog tasks are parkable; needs-clarification tasks require user review; project-subtask tasks belong under their larger workstream.
- Treat tags/categories as one shared classification system.
- Use project IDs when known. If project matching by name or alias is uncertain, add a warning instead of guessing.`;

const eventExportObject = (e: Event) => ({
  id: e.id,
  date: e.date,
  title: e.title,
  category: e.category,
  tag: e.category,
  startTime: e.startTime ?? null,
  endTime: e.endTime ?? null,
  color: e.color,
  notes: e.notes ?? null,
  displayPriority: e.displayPriority ?? (e.startTime ? 2 : 4),
  showInGrid: e.showInGrid !== false,
  showInExport: e.showInExport !== false,
  eventKind: e.eventKind ?? null,
  linkedTaskIds: e.linkedTaskIds ?? [],
  aiNotes: e.aiNotes ?? null,
  sourceNotes: e.sourceNotes ?? null,
  recurringGroupId: e.recurringGroupId ?? null,
});

const taskExportObject = (t: Task) => ({
  id: t.id,
  name: t.name,
  category: t.category,
  tag: t.category,
  dueDate: t.dueDate ?? null,
  dueDateType: t.dueDateType,
  triageStatus: t.triageStatus,
  status: t.status,
  owner: t.owner,
  priority: t.priority,
  projectId: t.projectId ?? null,
  parentTaskId: t.parentTaskId ?? null,
  linkedEventIds: t.linkedEventIds ?? [],
  nextAction: t.nextAction ?? null,
  notes: t.notes ?? null,
  schedulingNotes: t.schedulingNotes ?? null,
  recurringGroupId: t.recurringGroupId ?? null,
});

const adminAssistantIntro = (data: AppData, requestLabel: string, includeProjectsTags = true): string => `You are acting as my LifeGrid Admin Assistant. LifeGrid is a local-first personal planning app. I am pasting structured context exported from the app.

You can help me plan, analyze, prioritize, coordinate, draft messages, and prepare calendar/task changes. Work conversationally: acknowledge that you received the context, ask clarifying questions as needed, preserve existing commitments, and help me think through decisions before proposing changes. When I say "Output the final LifeGrid raw JSON patch only," produce raw JSON without markdown fences or explanation, including only changed/new/deleted items rather than the unchanged full dataset. Flag ambiguity in notes instead of guessing.

${aiReviewInstructions()}

First, briefly acknowledge that you received the LifeGrid context. Then help with this request: ${requestLabel}. If I have not asked for a specific analysis yet, wait for my next instruction after acknowledging.
${includeProjectsTags ? `
CATEGORY / TAG ORDER (shared IDs; preserve this saved order when possible)
${encodeCategoryOrder(data)}

PROJECTS — first-class LifeGrid project objects
${encodeProjects(data)}
` : ''}`;

// ─── Concrete schema + example the AI can mirror exactly ─────────────────────
const schemaReference = (categories: Category[]): string => {
  const ids = categories.map(c => c.id);
  const catUnion = ids.map(i => `"${i}"`).join(' | ') || '"other"';
  const colorLines = categories.map(c => `${c.id}=${c.color}`).join('  ');
  const firstCat = ids[0] ?? 'other';
  return `
${aiReviewInstructions()}

==================================================
OUTPUT FORMAT — return ONLY this LifeGrid patch v2 JSON, nothing else
==================================================

{
  "lifegridPatchVersion": 2,
  "notes": [],
  "warnings": [],
  "projects": {
    "add": [],
    "update": [],
    "delete": []
  },
  "events": {
    "add": [
      {
        "id": "evt-001",
        "date": "YYYY-MM-DD",
        "title": "Short event name",
        "category": "${firstCat}",
        "tag": "${firstCat}",
        "startTime": "09:00",
        "endTime": "10:00",
        "color": "${categories[0]?.color ?? '#6b7280'}",
        "notes": null,
        "displayPriority": 2,
        "showInGrid": true,
        "showInExport": true,
        "eventKind": "fixed-appointment",
        "linkedTaskIds": [],
        "aiNotes": null,
        "sourceNotes": null
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
        "tag": "${firstCat}",
        "dueDate": "YYYY-MM-DD",
        "dueDateType": "target-date",
        "triageStatus": "ready",
        "status": "todo",
        "owner": "Me",
        "priority": "medium",
        "projectId": null,
        "parentTaskId": null,
        "linkedEventIds": [],
        "nextAction": "First step",
        "notes": null,
        "schedulingNotes": null
      }
    ],
    "update": [],
    "delete": [],
    "complete": []
  }
}

FIELD RULES — follow exactly:
  date / dueDate : YYYY-MM-DD only (today is ${today()})
  category/tag   : ${catUnion}
  startTime      : "HH:MM" 24-hour, or null
  endTime        : "HH:MM" 24-hour, or null
  task status    : "todo" | "in-progress" | "done" | "blocked"
  priority       : "low" | "medium" | "high" | "urgent"
  dueDateType    : "real-deadline" | "target-date" | "someday-backlog" | "needs-clarification" | "project-subtask"
  triageStatus   : "ready" | "needs-review" | "blocked" | "waiting" | "duplicate-candidate" | "needs-scheduling" | "scheduled" | "backlog"
  project status : "active" | "paused" | "completed" | "archived"
  eventKind      : optional ${EVENT_KIND_RULE}; omit if unknown
  color          : hex that matches category when possible — ${colorLines}
  projectId      : optional project id from PROJECTS, or null

EXTRA RULES:
  - Use ONLY the category ids listed above. If nothing fits, use "other".
  - To EDIT an existing project/event/task, put its exact stable "id" in the update array with only changed fields.
  - To REMOVE an existing project/event/task, put its exact stable "id" string in the delete array.
  - Never delete by title/date/time matching. Title/date/time matches are review-only evidence for later safe reorganization support.
  - If eventKind is missing, treat it as unknown and not safe to delete.
  - To complete tasks, prefer tasks.complete with stable task IDs.
  - Omit arrays or leave them empty if there are no entries.
  - If a year is missing from a date, use ${new Date().getFullYear()} (or ${nextYear()} if the date has already passed).
  - Multi-day events: one entry per calendar day.
  - Recurring events: expand each occurrence individually for the next 3 months.
  - Do NOT wrap the JSON in markdown code fences.
  - Do NOT include any text before or after the JSON.
==================================================
`;
};

const patchSchemaReference = (categories: Category[]): string => {
  const ids = categories.map(c => c.id);
  const catUnion = ids.map(i => `"${i}"`).join(' | ') || '"other"';
  return `
${aiReviewInstructions()}

==================================================
OUTPUT FORMAT — return ONLY this LifeGrid patch v2 JSON
==================================================

{
  "lifegridPatchVersion": 2,
  "notes": [],
  "warnings": [],
  "projects": {
    "add": [],
    "update": [],
    "delete": []
  },
  "events": {
    "add": [],
    "update": [],
    "delete": [],
    "mergeIntoDayType": [],
    "convertTimedBlockToTask": [],
    "candidateDeletes": []
  },
  "tasks": {
    "add": [],
    "update": [],
    "delete": [],
    "complete": []
  },
  "reviewItems": {
    "add": []
  }
}

PROJECT FIELDS:
  id, name, color, order, aliases, status ("active" | "paused" | "completed" | "archived"), notes

EVENT FIELDS:
  id, date, title, category/tag, startTime, endTime, color, notes,
  displayPriority (1-5), showInGrid, showInExport, eventKind, linkedTaskIds, aiNotes, sourceNotes, recurringGroupId
  eventKind is optional: ${EVENT_KIND_RULE}. Missing eventKind means unknown and is not safe to delete.

TASK FIELDS:
  id, name, category/tag, dueDate, dueDateType, triageStatus, status, owner, priority,
  projectId, parentTaskId, linkedEventIds, nextAction, notes, schedulingNotes, recurringGroupId

RULES:
  - Return raw JSON only. No markdown fences and no explanation.
  - Do not repeat unchanged projects, events, or tasks.
  - Category/tag must be one of: ${catUnion}. Tags and categories are the same LifeGrid classification system. Use "other" if needed.
  - For simple task completion, put stable task IDs in tasks.complete.
  - Use exact stable IDs for update/delete. Do not delete items without stable IDs.
  - Never delete by title/date/time matching. Title/date/time matches are review-only evidence for later safe reorganization support.
  - Treat missing eventKind as unknown and not safe to delete.
  - Use project IDs when known. If matching by project name or alias is uncertain, add a warning instead of guessing.
  - Do not move real-deadline tasks unless I explicitly approved the move.
  - If something is ambiguous, add a short string to warnings or notes instead of guessing.

Backward compatibility accepted by LifeGrid, but prefer patch v2:
  new_events, updated_events, deleted_event_ids, new_tasks, updated_tasks, completed_task_ids, deleted_task_ids, notes
==================================================
`;
};

// ─── Compact event encoding (collapses repeated titles to cut prompt size) ────
const eventLinkSummary = (e: Event): string => [
  `id:${e.id}`,
  `kind:${e.eventKind ?? 'unknown'}`,
  (e.linkedTaskIds?.length ? `linkedTaskIds:${JSON.stringify(e.linkedTaskIds)}` : ''),
  (e.recurringGroupId ? `recurringGroupId:${e.recurringGroupId}` : ''),
].filter(Boolean).join('  ');

const taskLinkSummary = (t: Task): string => [
  `id:${t.id}`,
  `project:${t.projectId ?? 'none'}`,
  (t.parentTaskId ? `parentTaskId:${t.parentTaskId}` : ''),
  (t.linkedEventIds?.length ? `linkedEventIds:${JSON.stringify(t.linkedEventIds)}` : ''),
  (t.recurringGroupId ? `recurringGroupId:${t.recurringGroupId}` : ''),
].filter(Boolean).join('  ');

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
      const sorted = arr.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      const dates = sorted.map(e => e.date);
      const refs = sorted.map(e => `${e.id}@${e.date}${e.startTime ? `T${e.startTime}` : ''}`).join(', ');
      lines.push(`  ${title} ×${arr.length}  [${arr[0].category}]  (${dates[0]} … ${dates[dates.length - 1]})  kind:${arr[0].eventKind ?? 'unknown'}  ids:${refs}`);
    } else {
      singles.push(...arr);
    }
  });

  singles
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.id.localeCompare(b.id))
    .forEach(e => {
      lines.push(`  ${e.date}  ${e.startTime ?? '     '}  [${e.category}]  ${e.title}  ${eventLinkSummary(e)}`);
    });

  return lines.sort().join('\n');
};

const encodeEventsDetailed = (events: Event[]): string => {
  if (events.length === 0) return '  (none)';
  return events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.id.localeCompare(b.id))
    .map(e =>
      `  ${e.date}  ${e.startTime ?? '     '}${e.endTime ? `-${e.endTime}` : ''}  [${e.category}]  ${e.title}  ${eventLinkSummary(e)}` +
      (e.notes ? `  // ${e.notes}` : '')
    )
    .join('\n');
};

const encodeTasks = (tasks: Task[]): string => {
  if (tasks.length === 0) return '  (none)';
  const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  return tasks
    .slice()
    .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map(t =>
      `  [${t.priority.toUpperCase().padEnd(6)}] ${t.name}` +
      `  ${taskLinkSummary(t)}` +
      `  due:${t.dueDate ?? 'none'}  status:${t.status}  owner:${t.owner}` +
      `  tag/category:${t.category || 'untagged'}` +
      (t.nextAction ? `  → ${t.nextAction}` : '') +
      (t.schedulingNotes ? `  ⚙ constraints: ${t.schedulingNotes}` : '')
    )
    .join('\n');
};

// ─── Prompt types & their objective blocks ───────────────────────────────────
export type PromptType =
  | 'compact' | 'analyze' | 'conflicts' | 'freetime' | 'balance' | 'prep' | 'digest'
  | 'tasks-only' | 'availability' | 'projects' | 'messages' | 'patch';

export const PROMPT_TYPES: { id: PromptType; emoji: string; title: string; description: string; badge?: string }[] = [
  { id: 'compact',      emoji: '🧭', title: 'Admin planning',        description: 'Default: share compact LifeGrid context and ask the AI admin assistant to help.', badge: 'Fast' },
  { id: 'availability', emoji: '📅', title: 'Free time / meetings',  description: 'Find open slots, coordinate meetings, and schedule focus blocks.', badge: 'Focused' },
  { id: 'tasks-only',   emoji: '✅', title: 'Task prioritization',   description: 'Sort tasks, clarify next actions, and identify urgent work.', badge: 'Focused' },
  { id: 'projects',     emoji: '🧱', title: 'Project breakdown',     description: 'Break large projects into small actionable subtasks.' },
  { id: 'messages',     emoji: '✉️', title: 'Draft messages',        description: 'Draft emails/texts based on your schedule and tasks.' },
  { id: 'patch',        emoji: '🧩', title: 'Bulk updates / JSON',   description: 'Minimal raw JSON only: changed fields, completions, and deletes.', badge: 'Fast' },
  { id: 'analyze',      emoji: '🔍', title: 'Full schedule review',  description: 'Conflicts, overloaded days, missing prep, and general improvements.' },
  { id: 'freetime',     emoji: '🟢', title: 'Free-time scan',        description: 'Open slots and gaps where new things could be scheduled.' },
  { id: 'conflicts',    emoji: '⚠️', title: 'Conflict check',        description: 'Double-bookings and overlapping commitments only.' },
  { id: 'prep',         emoji: '🧰', title: 'Prep & buffers',        description: 'Suggest prep/buffer events before big items and deadlines.' },
  { id: 'balance',      emoji: '⚖️', title: 'Balance review',        description: 'Rest days, overwork streaks, and category balance.' },
  { id: 'digest',       emoji: '📋', title: 'Summary digest',        description: 'A readable rundown of the focus period (few or no changes).' },
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
  projects: `Focus on project breakdown:
1. Identify large goals that should become projects/tags
2. Break each project into small, discrete, actionable tasks
3. Assign projectId/category where obvious and flag ambiguity instead of guessing`,
  messages: `Help draft concise messages/emails:
1. Use the schedule/task context to draft reminders, coordination notes, or planning messages
2. Do not invent unavailable details
3. Only propose LifeGrid JSON changes if explicitly useful`,
  patch: `Create the smallest possible machine-importable update:
1. Return raw JSON only — no prose, no markdown, no unchanged data
2. Include only fields that must change
3. Prefer completed_task_ids for tasks that are simply done
4. Flag ambiguity in notes instead of guessing`,
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
  includeTasks?: boolean;
  includePeople?: boolean;
  includeCompletedTasks?: boolean;
  includeProjectsTags?: boolean;
}

// ─── 1. PLANNING PROMPT — analyze schedule, optionally scoped to a date range ─
export const generatePlanningPrompt = (data: AppData, opts: PlanningOptions = {}): string => {
  const {
    promptType = 'compact', focusStart, focusEnd,
    includeTasks = true, includePeople = true, includeCompletedTasks = false, includeProjectsTags = true,
  } = opts;

  // ── Primary LifeGrid Admin prompt: broad, efficient, and range-aware ──
  if (promptType === 'compact') {
    const t = today();
    const scoped = !!(focusStart && focusEnd);
    const inFocus = (date: string | null | undefined) => scoped && date ? (date >= focusStart! && date <= focusEnd!) : true;
    const rangeLabel = scoped ? `${focusStart} → ${focusEnd}` : 'the full selected LifeGrid calendar';
    const windowEvents = data.events.filter(e => inFocus(e.date));
    const tasksForPrompt = includeTasks
      ? data.tasks.filter(task => (includeCompletedTasks || task.status !== 'done') && (!scoped || !task.dueDate || inFocus(task.dueDate)))
      : [];
    const peopleLines = includePeople
      ? data.personEvents
        .filter(p => inFocus(p.date))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(p => `  ${p.date}  [${p.person}]  ${p.startTime ?? '     '}${p.endTime ? `-${p.endTime}` : ''}  ${p.title}`)
        .join('\n')
      : '  (not included by user choice)';

    return `${adminAssistantIntro(data, `comprehensive LifeGrid admin planning for ${rangeLabel}`, includeProjectsTags)}
Today is ${t}. The exported date range is ${rangeLabel}.

Help me plan, analyze, prioritize, coordinate, draft messages, and propose LifeGrid changes as requested. Start conversationally; do not output raw JSON until I explicitly ask: "Output the final LifeGrid raw JSON patch only."

When final changes are ready, the raw JSON patch must include only changed/new/deleted items, not the full unchanged dataset. Supported patch keys are new_events, updated_events, deleted_event_ids, new_tasks, updated_tasks, completed_task_ids, deleted_task_ids, and notes.

==================================================
EVENTS — ${rangeLabel} (${windowEvents.length})
==================================================
${encodeEventsDetailed(windowEvents)}

==================================================
${includeTasks ? `TASKS — ${includeCompletedTasks ? 'all included' : 'incomplete only'} (${tasksForPrompt.length})` : 'TASKS — not included'}
==================================================
${includeTasks ? encodeTasks(tasksForPrompt) : '  (not included by user choice)'}

==================================================
OTHER PEOPLE'S AVAILABILITY — ${includePeople ? rangeLabel : 'not included'}
==================================================
${peopleLines || '  (none)'}
${patchSchemaReference(data.categories)}`;
  }

  // ── JSON patch mode: same compact data window, minimal raw output only ──
  if (promptType === 'patch') {
    const t = today();
    const end14 = new Date(); end14.setDate(end14.getDate() + 14);
    const end14Str = end14.toISOString().split('T')[0];
    const windowEvents = data.events.filter(e => e.date >= t && e.date <= end14Str);
    const relevantTasks = data.tasks.filter(task =>
      task.status !== 'done' &&
      (task.priority === 'urgent' || task.priority === 'high' || (task.dueDate && task.dueDate <= end14Str))
    );
    const peopleLines = data.personEvents
      .filter(p => p.date >= t && p.date <= end14Str)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(p => `  ${p.date}  [${p.person}]  ${p.title}`)
      .join('\n');

    return `${adminAssistantIntro(data, 'bulk updates using minimal JSON patch output')}
Create a minimal JSON patch for my LifeGrid calendar for the next 14 days (${t} → ${end14Str}). Today is ${t}.

${OBJECTIVE.patch}

==================================================
EVENTS — next 14 days (${windowEvents.length})
==================================================
${encodeEventsDetailed(windowEvents)}

==================================================
TASKS — overdue, high-priority, or due within 14 days (${relevantTasks.length})
==================================================
${encodeTasks(relevantTasks)}

==================================================
OTHER PEOPLE'S SCHEDULE — next 14 days
==================================================
${peopleLines || '  (none)'}
${patchSchemaReference(data.categories)}`;
  }

  // ── Tasks-only mode ──
  if (promptType === 'tasks-only') {
    const incompleteTasks = data.tasks.filter(t => t.status !== 'done');
    return `${adminAssistantIntro(data, 'task prioritization and next-action planning')}
Analyze my task list and help me prioritize and schedule them. Today is ${today()}.

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
    return `${adminAssistantIntro(data, 'free-time finding and meeting coordination')}
Here is my calendar${scoped ? ` for ${focusStart} → ${focusEnd}` : ''}. Today is ${today()}.

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

  return `${adminAssistantIntro(data, OBJECTIVE[promptType].split('\n')[0])}
Analyze the schedule below and return a JSON object of proposed changes I can import into my scheduling app. Today is ${today()}.

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
  projects?: {
    add:    Project[];
    update: Array<{ id: string } & Partial<Project>>;
    delete: string[];
  };
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
  transformationProposals?: {
    mergeIntoDayType: MergeIntoDayTypeProposal[];
    convertTimedBlockToTask: ConvertTimedBlockToTaskProposal[];
    candidateDeletes: CandidateDeleteProposal[];
  };
  reviewItems?: {
    add: ReviewItemProposal[];
  };
  completedTaskIds?: string[];
  patchNotes?: string[];
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

  const dataKeyMatch = s.match(/\{\s*"(?:lifegridPatchVersion|projects|events|tasks|reviewItems|warnings|new_events|updated_events|deleted_event_ids|new_tasks|updated_tasks|completed_task_ids|deleted_task_ids|notes)"/);
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
  const existingProjectIds = new Set(existingData?.projects.map(p => p.id) ?? []);
  const warnings: string[] = [];
  if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings.filter((w: any) => typeof w === 'string'));


  const result: ParsedUpdate = {};
  if (Array.isArray(parsed.notes)) result.patchNotes = parsed.notes.filter((n: any) => typeof n === 'string');

  // Accept the v0.3.1 minimal patch shape and translate it into the
  // existing importer shape so applyImportUpdate remains backwards-compatible.
  const hasPatchKeys = [
    'new_events', 'updated_events', 'deleted_event_ids',
    'new_tasks', 'updated_tasks', 'completed_task_ids', 'deleted_task_ids',
  ].some(key => key in parsed);
  if (hasPatchKeys) {
    const completedTaskIds = normalizeIds(parsed.completed_task_ids ?? []);
    parsed = {
      events: {
        add: parsed.new_events ?? [],
        update: parsed.updated_events ?? [],
        delete: parsed.deleted_event_ids ?? [],
      },
      tasks: {
        add: parsed.new_tasks ?? [],
        update: [
          ...(Array.isArray(parsed.updated_tasks) ? parsed.updated_tasks : []),
          ...completedTaskIds.map(id => ({ id, status: 'done' })),
        ],
        delete: parsed.deleted_task_ids ?? [],
      },
      notes: parsed.notes,
      warnings: parsed.warnings,
    };
    result.completedTaskIds = completedTaskIds;
    if (Array.isArray(parsed.notes)) result.patchNotes = parsed.notes.filter((n: any) => typeof n === 'string');
  }

  // Accept canonical v2 tasks.complete as a completion shortcut.
  const canonicalCompletedTaskIds = normalizeIds(parsed.tasks?.complete ?? []);
  if (canonicalCompletedTaskIds.length > 0) {
    parsed.tasks = {
      ...(parsed.tasks ?? {}),
      update: [
        ...(Array.isArray(parsed.tasks?.update) ? parsed.tasks.update : []),
        ...canonicalCompletedTaskIds.map(id => ({ id, status: 'done' })),
      ],
    };
    result.completedTaskIds = [...new Set([...(result.completedTaskIds ?? []), ...canonicalCompletedTaskIds])];
  }

  if (parsed.projects) {
    const updateArr = Array.isArray(parsed.projects.update) ? parsed.projects.update : [];
    const deleteArr = normalizeIds(parsed.projects.delete ?? []);
    if (existingData) {
      updateArr.forEach((u: any) => {
        if (u?.id && !existingProjectIds.has(u.id)) warnings.push(`Project update ID not found: "${u.id}"`);
      });
      deleteArr.forEach((id: string) => {
        if (!existingProjectIds.has(id)) warnings.push(`Project delete ID not found: "${id}"`);
      });
    }
    const projectAdds = normalizeProjects(parsed.projects.add ?? []);
    warnSimilarProjectAdds(projectAdds, existingData?.projects ?? [], warnings);
    result.projects = {
      add: projectAdds,
      update: updateArr
        .filter((u: any) => u && typeof u.id === 'string')
        .map((u: any) => normalizeProjectUpdate(u)),
      delete: deleteArr,
    };
  }

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
    const projectIdsAfterAdds = new Set([...existingProjectIds, ...((result.projects?.add ?? []).map(p => p.id))]);
    const taskAdds = normalizeTasks(parsed.tasks.add ?? [], validCats);
    const taskUpdates = updateArr
      .filter((u: any) => u && typeof u.id === 'string')
      .map((u: any) => normalizeTaskUpdate(u, validCats));

    taskAdds.forEach(t => {
      if (t.projectId && !projectIdsAfterAdds.has(t.projectId)) warnings.push(`Task add references unknown projectId "${t.projectId}" for "${t.name}"`);
    });
    taskUpdates.forEach((u: { id: string } & Partial<Task>) => {
      if (u.projectId && !projectIdsAfterAdds.has(u.projectId)) warnings.push(`Task update references unknown projectId "${u.projectId}" for task "${u.id}"`);
      const existing = existingData?.tasks.find(t => t.id === u.id);
      if (existing?.dueDateType === 'real-deadline' && u.dueDate !== undefined && u.dueDate !== existing.dueDate) {
        warnings.push(`Real-deadline task "${existing.name}" (${existing.id}) dueDate change requested from ${existing.dueDate ?? 'none'} to ${u.dueDate ?? 'none'} — review before applying.`);
      }
    });

    result.tasks = {
      add:    taskAdds,
      update: taskUpdates,
      delete: deleteArr,
    };
  }

  if (parsed.events) {
    const mergeIntoDayType = normalizeMergeIntoDayTypeProposals(parsed.events.mergeIntoDayType ?? [], existingEventIds, warnings);
    const convertTimedBlockToTask = normalizeConvertTimedBlockToTaskProposals(parsed.events.convertTimedBlockToTask ?? [], existingEventIds, validCats, warnings);
    const candidateDeletes = normalizeCandidateDeleteProposals(parsed.events.candidateDeletes ?? [], warnings);
    if (mergeIntoDayType.length || convertTimedBlockToTask.length || candidateDeletes.length) {
      result.transformationProposals = {
        mergeIntoDayType,
        convertTimedBlockToTask,
        candidateDeletes,
      };
    }
  }

  const reviewItemAdds = normalizeReviewItems(parsed.reviewItems?.add ?? []);
  if (reviewItemAdds.length) result.reviewItems = { add: reviewItemAdds };

  const totalChanges =
    (result.projects?.add.length ?? 0) + (result.projects?.update.length ?? 0) + (result.projects?.delete.length ?? 0) +
    (result.events?.add.length ?? 0) + (result.events?.update.length ?? 0) + (result.events?.delete.length ?? 0) +
    (result.tasks?.add.length ?? 0) + (result.tasks?.update.length ?? 0) + (result.tasks?.delete.length ?? 0);

  const totalReviewOnly =
    (result.transformationProposals?.mergeIntoDayType.length ?? 0) +
    (result.transformationProposals?.convertTimedBlockToTask.length ?? 0) +
    (result.transformationProposals?.candidateDeletes.length ?? 0) +
    (result.reviewItems?.add.length ?? 0);

  if (totalChanges === 0 && totalReviewOnly === 0 && !result.projects && !result.events && !result.tasks && !result.reviewItems) {
    throw new Error(
      'The JSON doesn\'t contain "projects", "events", "tasks", "reviewItems", or supported reorganization proposal keys.\n' +
      'Make sure you used the exact prompt from this app and pasted the complete AI response.'
    );
  }

  if (warnings.length > 0) result.warnings = warnings;
  return result;
};

// ─── Normalizers ─────────────────────────────────────────────────────────────
const VALID_STA = new Set(['todo', 'in-progress', 'done', 'blocked']);
const VALID_PRI = new Set(['low', 'medium', 'high', 'urgent']);
const VALID_DUE_DATE_TYPE = new Set<TaskDueDateType>(['real-deadline', 'target-date', 'someday-backlog', 'needs-clarification', 'project-subtask']);
const VALID_TRIAGE_STATUS = new Set<TaskTriageStatus>(['ready', 'needs-review', 'blocked', 'waiting', 'duplicate-candidate', 'needs-scheduling', 'scheduled', 'backlog']);
const VALID_EVENT_PRIORITY = new Set<EventDisplayPriority>([1, 2, 3, 4, 5]);
const VALID_EVENT_KIND = EVENT_KIND_SET;

function normalizeEvents(arr: any[], validCats: Set<string>, colorMap: Record<string, string>): Event[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(e => e && typeof e === 'object')
    .map((e, i) => {
      const rawCat = e.category ?? e.tag ?? (Array.isArray(e.tags) ? e.tags[0] : undefined);
      const cat = validCats.has(rawCat) ? rawCat : 'other';
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
        displayPriority: VALID_EVENT_PRIORITY.has(Number(e.displayPriority) as EventDisplayPriority)
          ? Number(e.displayPriority) as EventDisplayPriority
          : (e.startTime ? 2 : 4),
        showInGrid: typeof e.showInGrid === 'boolean' ? e.showInGrid : true,
        showInExport: typeof e.showInExport === 'boolean' ? e.showInExport : true,
        ...(VALID_EVENT_KIND.has(e.eventKind) ? { eventKind: e.eventKind } : {}),
        linkedTaskIds: normalizeIds(e.linkedTaskIds ?? []),
        aiNotes: e.aiNotes ?? null,
        sourceNotes: e.sourceNotes ?? null,
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
      category:        validCats.has(t.category ?? t.tag ?? (Array.isArray(t.tags) ? t.tags[0] : undefined)) ? (t.category ?? t.tag ?? t.tags?.[0]) : 'other',
      dueDate:         t.dueDate ? fixDate(t.dueDate) : null,
      status:          VALID_STA.has(t.status) ? t.status : 'todo',
      owner:           String(t.owner ?? 'Me'),
      nextAction:      t.nextAction ?? null,
      notes:           t.notes ?? null,
      schedulingNotes: t.schedulingNotes ?? null,
      priority:        VALID_PRI.has(t.priority) ? t.priority : 'medium',
      projectId:       typeof t.projectId === 'string' ? t.projectId : null,
      dueDateType:     VALID_DUE_DATE_TYPE.has(t.dueDateType) ? t.dueDateType : (t.dueDate ? (t.projectId ? 'project-subtask' : 'target-date') : 'someday-backlog'),
      triageStatus:    VALID_TRIAGE_STATUS.has(t.triageStatus) ? t.triageStatus : (t.status === 'blocked' ? 'blocked' : t.status === 'done' ? 'backlog' : t.dueDate ? 'ready' : 'backlog'),
      parentTaskId:    typeof t.parentTaskId === 'string' ? t.parentTaskId : null,
      linkedEventIds:  normalizeIds(t.linkedEventIds ?? []),
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
  if (u.category !== undefined || u.tag !== undefined || u.tags !== undefined) {
    const rawCat = u.category ?? u.tag ?? (Array.isArray(u.tags) ? u.tags[0] : undefined);
    out.category = validCats.has(rawCat) ? rawCat : 'other';
  }
  if (u.color    !== undefined) out.color = String(u.color);
  if ('startTime' in u) out.startTime = fixTime(u.startTime);
  if ('endTime'   in u) out.endTime   = fixTime(u.endTime);
  if ('notes'     in u) out.notes = u.notes ?? null;
  if ('displayPriority' in u && VALID_EVENT_PRIORITY.has(Number(u.displayPriority) as EventDisplayPriority)) out.displayPriority = Number(u.displayPriority);
  if ('showInGrid' in u) out.showInGrid = Boolean(u.showInGrid);
  if ('showInExport' in u) out.showInExport = Boolean(u.showInExport);
  if ('eventKind' in u && VALID_EVENT_KIND.has(u.eventKind)) out.eventKind = u.eventKind;
  if ('linkedTaskIds' in u) out.linkedTaskIds = normalizeIds(u.linkedTaskIds ?? []);
  if ('aiNotes' in u) out.aiNotes = u.aiNotes ?? null;
  if ('sourceNotes' in u) out.sourceNotes = u.sourceNotes ?? null;
  if (out.category && !out.color) out.color = colorMap[out.category];
  return out;
}

function normalizeTaskUpdate(u: any, validCats: Set<string>): { id: string } & Partial<Task> {
  const out: any = { id: String(u.id) };
  if (u.name     !== undefined) out.name = String(u.name);
  if (u.category !== undefined || u.tag !== undefined || u.tags !== undefined) {
    const rawCat = u.category ?? u.tag ?? (Array.isArray(u.tags) ? u.tags[0] : undefined);
    out.category = validCats.has(rawCat) ? rawCat : 'other';
  }
  if (u.dueDate  !== undefined) { const d = fixDate(String(u.dueDate)); if (d) out.dueDate = d; }
  if (u.status   !== undefined && VALID_STA.has(u.status))  out.status   = u.status;
  if (u.priority !== undefined && VALID_PRI.has(u.priority)) out.priority = u.priority;
  if ('notes'          in u) out.notes          = u.notes ?? null;
  if ('nextAction'     in u) out.nextAction     = u.nextAction ?? null;
  if ('schedulingNotes' in u) out.schedulingNotes = u.schedulingNotes ?? null;
  if ('owner'          in u) out.owner          = String(u.owner ?? 'Me');
  if ('projectId'      in u) out.projectId      = u.projectId ? String(u.projectId) : null;
  if ('dueDateType'    in u && VALID_DUE_DATE_TYPE.has(u.dueDateType)) out.dueDateType = u.dueDateType;
  if ('triageStatus'   in u && VALID_TRIAGE_STATUS.has(u.triageStatus)) out.triageStatus = u.triageStatus;
  if ('parentTaskId'   in u) out.parentTaskId = u.parentTaskId ? String(u.parentTaskId) : null;
  if ('linkedEventIds' in u) out.linkedEventIds = normalizeIds(u.linkedEventIds ?? []);
  return out;
}

const VALID_PROJECT_STATUS = new Set<ProjectStatus>(['active', 'paused', 'completed', 'archived']);

function normalizeProjects(arr: any[]): Project[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(p => p && typeof p === 'object')
    .map((p, i) => ({
      id:      String(p.id ?? `imp-proj-${Date.now()}-${i}`),
      name:    String(p.name ?? 'Untitled Project'),
      color:   String(p.color ?? '#6b7280'),
      order:   typeof p.order === 'number' ? p.order : i,
      aliases: Array.isArray(p.aliases) ? p.aliases.map(String) : [],
      status:  VALID_PROJECT_STATUS.has(p.status) ? p.status : 'active',
      notes:   p.notes ?? null,
    } as Project));
}

function warnSimilarProjectAdds(adds: Project[], existing: Project[], warnings: string[]): void {
  const existingNames = existing.map(p => p.name.toLowerCase());
  adds.forEach(p => {
    const lower = p.name.toLowerCase();
    if (existingNames.includes(lower)) {
      warnings.push(`Project add may duplicate existing project: "${p.name}"`);
    }
  });
}

function normalizeProjectUpdate(u: any): { id: string } & Partial<Project> {
  const out: any = { id: String(u.id) };
  if (u.name    !== undefined) out.name    = String(u.name);
  if (u.color   !== undefined) out.color   = String(u.color);
  if (u.order   !== undefined && typeof u.order === 'number') out.order = u.order;
  if (u.aliases !== undefined && Array.isArray(u.aliases)) out.aliases = u.aliases.map(String);
  if (u.status  !== undefined && VALID_PROJECT_STATUS.has(u.status)) out.status = u.status;
  if ('notes'   in u) out.notes = u.notes ?? null;
  return out;
}


// ─── Proposal types (review-only / transformation proposals from AI) ──────────

type ProposalStatus = 'parsed' | 'blocked-review-only' | 'review-only';

interface MergeIntoDayTypeProposal {
  sourceEventId: string | null;
  targetDayTypeEventId: string | null;
  mergeMode: string;
  noteSection: string | null;
  deleteSourceAfterMerge: boolean;
  preserveSourceInAuditTrail: boolean;
  reason: string | null;
  status: ProposalStatus;
  blockingReasons: string[];
}

interface ConvertTimedBlockToTaskProposal {
  sourceEventId: string | null;
  newTask: Partial<Task> & { name?: string };
  deleteSourceAfterConvert: boolean;
  reason: string | null;
  status: ProposalStatus;
  blockingReasons: string[];
}

interface CandidateDeleteProposal {
  match: {
    date: string | null;
    title: string | null;
    startTime: string | null;
    endTime: string | null;
  };
  confidence: string;
  requiresUserReview: boolean;
  reason: string | null;
  status: ProposalStatus;
}

type ReviewItemType =
  | 'needs-user-review'
  | 'scheduling-conflict'
  | 'overdue'
  | 'duplicate-candidate'
  | 'coverage-gap'
  | 'suggestion';

type ReviewItemSeverity = 'high' | 'medium' | 'low';

interface ReviewItemProposal {
  id: string;
  type: ReviewItemType;
  severity: ReviewItemSeverity;
  date: string | null;
  title: string;
  description: string | null;
  recommendedAction: string | null;
  affectedItemRefs: string[];
  canAutoFix: boolean;
  triageStatus: TaskTriageStatus;
}

const VALID_CANDIDATE_CONFIDENCE = new Set(['high', 'medium', 'low', 'unknown']);
const VALID_REVIEW_TYPES = new Set<ReviewItemType>([
  'needs-user-review', 'scheduling-conflict', 'overdue',
  'duplicate-candidate', 'coverage-gap', 'suggestion',
]);
const VALID_REVIEW_SEVERITIES = new Set<ReviewItemSeverity>(['high', 'medium', 'low']);

function normalizeMergeIntoDayTypeProposals(arr: any[], existingEventIds: Set<string>, warnings: string[]): MergeIntoDayTypeProposal[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(p => p && typeof p === 'object')
    .map((p, i) => {
      const sourceEventId = typeof p.sourceEventId === 'string' && p.sourceEventId.trim() ? p.sourceEventId.trim() : null;
      const targetDayTypeEventId = typeof p.targetDayTypeEventId === 'string' && p.targetDayTypeEventId.trim() ? p.targetDayTypeEventId.trim() : null;
      const blockingReasons: string[] = [];
      if (!sourceEventId) blockingReasons.push('Missing sourceEventId');
      else if (!existingEventIds.has(sourceEventId)) blockingReasons.push(`Unknown sourceEventId "${sourceEventId}"`);
      if (!targetDayTypeEventId) blockingReasons.push('Missing targetDayTypeEventId');
      else if (!existingEventIds.has(targetDayTypeEventId)) blockingReasons.push(`Unknown targetDayTypeEventId "${targetDayTypeEventId}"`);
      if (blockingReasons.length) warnings.push(`mergeIntoDayType proposal ${i + 1} is blocked/review-only: ${blockingReasons.join('; ')}`);
      return {
        sourceEventId,
        targetDayTypeEventId,
        mergeMode: typeof p.mergeMode === 'string' && p.mergeMode.trim() ? p.mergeMode.trim() : 'append-to-notes',
        noteSection: typeof p.noteSection === 'string' && p.noteSection.trim() ? p.noteSection.trim() : null,
        deleteSourceAfterMerge: Boolean(p.deleteSourceAfterMerge),
        preserveSourceInAuditTrail: p.preserveSourceInAuditTrail !== false,
        reason: typeof p.reason === 'string' && p.reason.trim() ? p.reason.trim() : null,
        status: blockingReasons.length ? 'blocked-review-only' : 'parsed',
        blockingReasons,
      } as MergeIntoDayTypeProposal;
    });
}

function normalizeConvertTimedBlockToTaskProposals(
  arr: any[], existingEventIds: Set<string>, validCats: Set<string>, warnings: string[]
): ConvertTimedBlockToTaskProposal[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(p => p && typeof p === 'object')
    .map((p, i) => {
      const sourceEventId = typeof p.sourceEventId === 'string' && p.sourceEventId.trim() ? p.sourceEventId.trim() : null;
      const newTask = normalizeProposedTask(p.newTask ?? {}, validCats);
      const blockingReasons: string[] = [];
      if (!sourceEventId) blockingReasons.push('Missing sourceEventId');
      else if (!existingEventIds.has(sourceEventId)) blockingReasons.push(`Unknown sourceEventId "${sourceEventId}"`);
      if (!newTask.name) blockingReasons.push('Missing newTask.name');
      if (blockingReasons.length) warnings.push(`convertTimedBlockToTask proposal ${i + 1} is blocked/review-only: ${blockingReasons.join('; ')}`);
      return {
        sourceEventId,
        newTask,
        deleteSourceAfterConvert: Boolean(p.deleteSourceAfterConvert),
        reason: typeof p.reason === 'string' && p.reason.trim() ? p.reason.trim() : null,
        status: blockingReasons.length ? 'blocked-review-only' : 'parsed',
        blockingReasons,
      } as ConvertTimedBlockToTaskProposal;
    });
}

function normalizeProposedTask(raw: any, validCats: Set<string>): Partial<Task> & { name?: string } {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Task> & { name?: string } = {};
  if (typeof raw.name === 'string' && raw.name.trim()) out.name = raw.name.trim();
  const rawCat = raw.category ?? raw.tag ?? (Array.isArray(raw.tags) ? raw.tags[0] : undefined);
  if (validCats.has(rawCat)) out.category = rawCat;
  if (raw.dueDate !== undefined) out.dueDate = fixDate(String(raw.dueDate));
  if (raw.status !== undefined && VALID_STA.has(raw.status)) out.status = raw.status;
  if (raw.priority !== undefined && VALID_PRI.has(raw.priority)) out.priority = raw.priority;
  if (raw.dueDateType !== undefined && VALID_DUE_DATE_TYPE.has(raw.dueDateType)) out.dueDateType = raw.dueDateType;
  if (raw.triageStatus !== undefined && VALID_TRIAGE_STATUS.has(raw.triageStatus)) out.triageStatus = raw.triageStatus;
  if (raw.owner !== undefined) out.owner = String(raw.owner ?? 'Me');
  if ('notes' in raw) out.notes = raw.notes ?? null;
  if ('nextAction' in raw) out.nextAction = raw.nextAction ?? null;
  if ('schedulingNotes' in raw) out.schedulingNotes = raw.schedulingNotes ?? null;
  if ('projectId' in raw) out.projectId = raw.projectId ? String(raw.projectId) : null;
  if ('parentTaskId' in raw) out.parentTaskId = raw.parentTaskId ? String(raw.parentTaskId) : null;
  if ('linkedEventIds' in raw) out.linkedEventIds = normalizeIds(raw.linkedEventIds ?? []);
  return out;
}

function normalizeCandidateDeleteProposals(arr: any[], warnings: string[]): CandidateDeleteProposal[] {
  if (!Array.isArray(arr)) return [];
  const proposals = arr
    .filter(p => p && typeof p === 'object')
    .map(p => {
      const match = p.match && typeof p.match === 'object' ? p.match : {};
      const confidence = VALID_CANDIDATE_CONFIDENCE.has(p.confidence) ? p.confidence : 'unknown';
      return {
        match: {
          date: match.date ? fixDate(String(match.date)) : null,
          title: typeof match.title === 'string' && match.title.trim() ? match.title.trim() : null,
          startTime: fixTime(match.startTime),
          endTime: fixTime(match.endTime),
        },
        confidence,
        requiresUserReview: p.requiresUserReview !== false,
        reason: typeof p.reason === 'string' && p.reason.trim() ? p.reason.trim() : null,
        status: 'review-only',
      } as CandidateDeleteProposal;
    });
  if (proposals.length) warnings.push(`${proposals.length} candidate delete proposal${proposals.length === 1 ? '' : 's'} parsed as review-only. Candidate deletes are never auto-applied.`);
  return proposals;
}

function normalizeReviewItems(arr: any[]): ReviewItemProposal[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(item => item && typeof item === 'object')
    .map((item, i) => {
      const type: ReviewItemType = VALID_REVIEW_TYPES.has(item.type) ? item.type : 'needs-user-review';
      const severity: ReviewItemSeverity = VALID_REVIEW_SEVERITIES.has(item.severity) ? item.severity : 'medium';
      const triageStatus: TaskTriageStatus = VALID_TRIAGE_STATUS.has(item.triageStatus) ? item.triageStatus : 'needs-review';
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `review-${Date.now()}-${i}`,
        type,
        severity,
        date: item.date ? fixDate(String(item.date)) : null,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'AI review item',
        description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : null,
        recommendedAction: typeof item.recommendedAction === 'string' && item.recommendedAction.trim() ? item.recommendedAction.trim() : null,
        affectedItemRefs: normalizeIds(item.affectedItemRefs ?? []),
        canAutoFix: Boolean(item.canAutoFix),
        triageStatus,
      };
    });
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
