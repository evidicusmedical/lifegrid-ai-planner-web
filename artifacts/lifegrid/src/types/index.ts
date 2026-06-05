export type EventCategory = 'work' | 'personal' | 'health' | 'travel' | 'family' | 'other';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PersonType = 'wife' | 'shared';

export interface Event {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: EventCategory;
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  color: string;
  notes: string | null;
}

export interface Task {
  id: string;
  name: string;
  category: string;
  dueDate: string | null; // YYYY-MM-DD
  status: TaskStatus;
  owner: string;
  nextAction: string | null;
  notes: string | null;
  priority: TaskPriority;
}

export interface PersonEvent {
  id: string;
  person: PersonType;
  date: string; // YYYY-MM-DD
  title: string;
  notes: string | null;
  color: string;
}

export interface AppData {
  events: Event[];
  tasks: Task[];
  personEvents: PersonEvent[];
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
