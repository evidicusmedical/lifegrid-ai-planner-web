export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

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
}

export interface Event {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: CategoryId;
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  color: string;
  notes: string | null;
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
}

export interface PersonEvent {
  id: string;
  person: PersonId;
  date: string; // YYYY-MM-DD
  title: string;
  notes: string | null;
  color: string;
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
}

export interface AppData {
  events: Event[];
  tasks: Task[];
  personEvents: PersonEvent[];
  categories: Category[];
  people: Person[];
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
  events?: {
    add?: Event[];
    update?: (Partial<Event> & { id: string })[];
    delete?: string[];
  };
  tasks?: {
    add?: Task[];
    update?: (Partial<Task> & { id: string })[];
    delete?: string[];
  };
}
