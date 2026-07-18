export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type TaskDueDateType = 'real-deadline' | 'target-date' | 'someday-backlog' | 'needs-clarification' | 'project-subtask';
export type TaskTriageStatus = 'ready' | 'needs-review' | 'blocked' | 'waiting' | 'duplicate-candidate' | 'needs-scheduling' | 'scheduled' | 'backlog';
export type EventDisplayPriority = 1 | 2 | 3 | 4 | 5;
export type TimeStatus = 'all-day' | 'timed' | 'unknown' | 'approximate';
export type TimeZoneMode = 'zoned' | 'floating';
export type EventKind =
  | 'fixed-appointment'
  | 'shift'
  | 'travel'
  | 'day-type'
  | 'flexible-work-block'
  | 'reminder'
  | 'placeholder'
  | 'protected-time';

// Categories and people are now user-defined. These string aliases are kept
// for readability — values reference a Category.id / Person.id.
export type CategoryId = string;
export type PersonId = string;

// Backwards-compatible aliases (older code referenced these names)
export type EventCategory = string;
export type PersonType = string;

export interface Category {
  id: string;
  label: string;
  color: string;
}

export interface Person {
  id: string;
  label: string;
  color: string;
  /** Persistent per-calendar display order. */
  order: number;
}

// ─── Projects / major events ──────────────────────────────────────────────────
// A lightweight grouping layer for tasks. Tasks can optionally belong to one
// project. Projects are per-calendar and stored alongside other AppData.
export interface Project {
  id: string;
  name: string;
  color: string;
  order: number;
  aliases: string[];
  status: ProjectStatus;
  notes: string | null;
}

/** A date-only project checkpoint.  Milestones intentionally are neither tasks nor events. */
export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: string | null;
  status: 'planned' | 'completed';
  completedDate: string | null;
  notes: string | null;
  order: number;
}

export interface Event {
  id: string;
  date: string; // YYYY-MM-DD
  endDate: string | null; // inclusive YYYY-MM-DD
  timeStatus: TimeStatus;
  timeZone: string | null; // IANA timezone for zoned clock times
  timeZoneMode: TimeZoneMode | null;
  title: string;
  category: CategoryId;
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  color: string;
  notes: string | null;
  displayPriority: EventDisplayPriority;
  showInGrid: boolean;
  showInExport: boolean;
  eventKind?: EventKind;
  linkedTaskIds: string[];
  aiNotes: string | null;
  sourceNotes: string | null;
  // Links recurring / multi-day siblings — all share the same group ID.
  recurringGroupId?: string;
}

export interface Task {
  id: string;
  name: string;
  category: CategoryId;
  dueDate: string | null; // YYYY-MM-DD
  status: TaskStatus;
  owner: string;
  nextAction: string | null;
  notes: string | null;
  priority: TaskPriority;
  // Scheduling parameters / dependencies — exported to AI for analysis.
  schedulingNotes?: string | null;
  // Optional parent project / major event.
  projectId?: string | null;
  dueDateType: TaskDueDateType;
  triageStatus: TaskTriageStatus;
  parentTaskId: string | null;
  linkedEventIds: string[];
  // Links recurring task siblings.
  recurringGroupId?: string;
}

export interface PersonEvent {
  id: string;
  person: PersonId;
  date: string; // YYYY-MM-DD
  endDate: string | null;
  timeStatus: TimeStatus;
  timeZone: string | null;
  timeZoneMode: TimeZoneMode | null;
  title: string;
  notes: string | null;
  color: string;
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  // Links multi-day / recurring person-event siblings.
  recurringGroupId?: string;
}

export interface AppData {
  events: Event[];
  tasks: Task[];
  personEvents: PersonEvent[];
  categories: Category[];
  people: Person[];
  projects: Project[];
  milestones: Milestone[];
}

// ─── Calendar versioning ──────────────────────────────────────────────────────
export interface Calendar {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  data: AppData;
}

export interface Store {
  calendars: Calendar[];
  activeCalendarId: string;
}

export interface ImportUpdate {
  projects?: {
    add?: Project[];
    update?: (Partial<Project> & { id: string })[];
    delete?: string[];
  };
  events?: {
    add?: Event[];
    update?: (Partial<Event> & { id: string })[];
    delete?: string[];
  };
  tasks?: {
    add?: Task[];
    update?: (Partial<Task> & { id: string })[];
    delete?: string[];
    complete?: string[];
  };
}
