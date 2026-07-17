import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppData, Event, Task, PersonEvent, Category, Person, Project, Calendar, Store,
  EventDisplayPriority, EventKind, ProjectStatus, TaskDueDateType, TaskTriageStatus,
} from '../types';
import { defaultData, DEFAULT_CATEGORIES, DEFAULT_PEOPLE } from '../lib/sampleData';
import { applyTransformationProposals, TransformationProposalSet } from '../lib/applyTransformations';
import { analyzeDependencies } from '../lib/aiDependencies';

export interface AppDataContextType extends AppData {
  // Active calendar identity
  calendars: Calendar[];
  activeCalendarId: string;
  activeCalendar: Calendar;

  // Event CRUD
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;

  // Task CRUD
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Person-event CRUD
  addPersonEvent: (event: PersonEvent) => void;
  updatePersonEvent: (id: string, event: Partial<PersonEvent>) => void;
  deletePersonEvent: (id: string) => void;

  // Category CRUD + reorder
  addCategory: (category: Category) => void;
  updateCategory: (id: string, update: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  // Person CRUD
  addPerson: (person: Person) => void;
  updatePerson: (id: string, update: Partial<Person>) => void;
  deletePerson: (id: string) => void;

  // Project CRUD
  addProject: (project: Project) => void;
  updateProject: (id: string, update: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Calendar versioning
  createCalendar: (name: string, seed?: 'empty' | 'sample' | 'duplicate') => string;
  renameCalendar: (id: string, name: string) => void;
  deleteCalendar: (id: string) => void;
  switchCalendar: (id: string) => void;
  duplicateCalendar: (id: string, name?: string) => string;

  // Import / backup
  applyImportUpdate: (update: any, transformationArgs?: { proposals: TransformationProposalSet; approvedProposalIds: Set<string> }, target?: { newVersionName?: string }) => string[];
  exportBackup: () => string;
  importBackup: (json: string) => void;
  clearActiveCalendar: () => void;
  lastBackupAt: string | null;
  recordBackup: () => void;

  // Recurring / multi-day group deletes
  deleteEventGroup: (groupId: string) => void;
  deleteTaskGroup: (groupId: string) => void;
  deletePersonEventGroup: (groupId: string) => void;
}

const AppContext = createContext<AppDataContextType | undefined>(undefined);

const STORE_KEY = 'lifegrid_store_v5';
const LEGACY_KEY = 'lifegrid_data';
const BACKUP_TS_KEY = 'lifegrid_last_backup';

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Ensure an AppData blob has all required collections ──────────────────────
const PROJECT_STATUSES = new Set<ProjectStatus>(['active', 'paused', 'completed', 'archived']);
const TASK_DUE_DATE_TYPES = new Set<TaskDueDateType>(['real-deadline', 'target-date', 'someday-backlog', 'needs-clarification', 'project-subtask']);
const TASK_TRIAGE_STATUSES = new Set<TaskTriageStatus>(['ready', 'needs-review', 'blocked', 'waiting', 'duplicate-candidate', 'needs-scheduling', 'scheduled', 'backlog']);
const EVENT_DISPLAY_PRIORITIES = new Set<EventDisplayPriority>([1, 2, 3, 4, 5]);
const EVENT_KINDS = new Set<EventKind>([
  'fixed-appointment',
  'shift',
  'travel',
  'day-type',
  'flexible-work-block',
  'reminder',
  'placeholder',
  'protected-time',
]);

const stringArray = (value: any): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean))]
    : [];

const normalizeProject = (p: any, index: number): Project => ({
  id: String(p?.id ?? `proj-${Date.now()}-${index}`),
  name: String(p?.name ?? 'Untitled Project'),
  color: typeof p?.color === 'string' ? p.color : '#059669',
  order: Number.isFinite(Number(p?.order)) ? Number(p.order) : index,
  aliases: stringArray(p?.aliases),
  status: PROJECT_STATUSES.has(p?.status) ? p.status : 'active',
  notes: typeof p?.notes === 'string' && p.notes.trim() ? p.notes : null,
});

const normalizeAppData = (raw: any): AppData => {
  const categories: Category[] = Array.isArray(raw?.categories) && raw.categories.length
    ? raw.categories
    : DEFAULT_CATEGORIES.map(c => ({ ...c }));

  const data: AppData = {
    events: Array.isArray(raw?.events) ? raw.events : [],
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : [],
    personEvents: Array.isArray(raw?.personEvents) ? raw.personEvents : [],
    categories,
    // People may be intentionally empty — only fall back to defaults when the
    // field is entirely missing/invalid (fresh install / legacy migration).
    people: Array.isArray(raw?.people)
      ? raw.people
      : DEFAULT_PEOPLE.map(p => ({ ...p })),
    // Projects are optional — existing data migrates with empty list.
    projects: Array.isArray(raw?.projects) ? raw.projects.map(normalizeProject) : [],
  };
  // Make sure every event/task category exists; fall back to "other".
  const catIds = new Set(data.categories.map(c => c.id));
  if (!catIds.has('other')) {
    data.categories.push({ id: 'other', label: 'Other', color: '#6b7280' });
    catIds.add('other');
  }
  const eventIds = new Set(data.events.map(e => e.id).filter(Boolean));
  const taskIds = new Set(data.tasks.map(t => t.id).filter(Boolean));
  const projectIds = new Set(data.projects.map(p => p.id));

  data.events = data.events.map(e => {
    const startTime = e.startTime ?? null;
    const rawPriority = Number(e.displayPriority);
    const displayPriority = EVENT_DISPLAY_PRIORITIES.has(rawPriority as EventDisplayPriority)
      ? rawPriority as EventDisplayPriority
      : (startTime ? 2 : 4);
    return {
      ...e,
      category: catIds.has(e.category) ? e.category : 'other',
      startTime,
      endTime: e.endTime ?? null,
      notes: e.notes ?? null,
      displayPriority,
      showInGrid: typeof e.showInGrid === 'boolean' ? e.showInGrid : true,
      showInExport: typeof e.showInExport === 'boolean' ? e.showInExport : true,
      eventKind: typeof e.eventKind === 'string' && EVENT_KINDS.has(e.eventKind as EventKind) ? e.eventKind as EventKind : undefined,
      linkedTaskIds: stringArray(e.linkedTaskIds).filter(id => taskIds.has(id)),
      aiNotes: typeof e.aiNotes === 'string' && e.aiNotes.trim() ? e.aiNotes : null,
      sourceNotes: typeof e.sourceNotes === 'string' && e.sourceNotes.trim() ? e.sourceNotes : null,
    };
  });
  data.tasks = data.tasks.map(t => {
    const dueDate = t.dueDate ?? null;
    const projectId = t.projectId && projectIds.has(t.projectId) ? t.projectId : null;
    const dueDateType: TaskDueDateType = TASK_DUE_DATE_TYPES.has(t.dueDateType)
      ? t.dueDateType
      : (!dueDate ? 'someday-backlog' : projectId ? 'project-subtask' : 'target-date');
    const triageStatus: TaskTriageStatus = TASK_TRIAGE_STATUSES.has(t.triageStatus)
      ? t.triageStatus
      : (t.status === 'blocked' ? 'blocked' : t.status === 'done' ? 'backlog' : dueDate ? 'ready' : 'backlog');
    const parentTaskId = typeof t.parentTaskId === 'string' && t.parentTaskId !== t.id && taskIds.has(t.parentTaskId)
      ? t.parentTaskId
      : null;
    return {
      ...t,
      category: catIds.has(t.category) ? t.category : 'other',
      dueDate,
      nextAction: t.nextAction ?? null,
      notes: t.notes ?? null,
      schedulingNotes: t.schedulingNotes ?? null,
      projectId,
      dueDateType,
      triageStatus,
      parentTaskId,
      linkedEventIds: stringArray(t.linkedEventIds).filter(id => eventIds.has(id)),
    };
  });
  // Make sure every person-event person exists.
  const personIds = new Set(data.people.map(p => p.id));
  data.personEvents = data.personEvents.map(pe => ({
    ...pe,
    person: personIds.has(pe.person) ? pe.person : (data.people[0]?.id ?? 'shared'),
  }));
  return data;
};

const freshCalendar = (name: string, data: AppData): Calendar => ({
  id: uid(),
  name,
  createdAt: new Date().toISOString(),
  data,
});

// ─── Load store, migrating legacy single-calendar data if present ─────────────
const loadStore = (): Store => {
  try {
    const rawNew = localStorage.getItem(STORE_KEY);
    if (rawNew) {
      const parsed = JSON.parse(rawNew);
      if (parsed && Array.isArray(parsed.calendars) && parsed.calendars.length) {
        const calendars: Calendar[] = parsed.calendars.map((c: any) => ({
          id: c.id ?? uid(),
          name: c.name ?? 'Calendar',
          createdAt: c.createdAt ?? new Date().toISOString(),
          data: normalizeAppData(c.data),
        }));
        const activeCalendarId = calendars.some(c => c.id === parsed.activeCalendarId)
          ? parsed.activeCalendarId
          : calendars[0].id;
        return { calendars, activeCalendarId };
      }
    }
  } catch (e) {
    console.error('Failed to parse store', e);
  }

  // Migrate legacy single-calendar data → first versioned calendar
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = normalizeAppData(JSON.parse(legacy));
      const cal = freshCalendar('My Calendar', data);
      return { calendars: [cal], activeCalendarId: cal.id };
    }
  } catch (e) {
    console.error('Failed to migrate legacy data', e);
  }

  // Fresh install — seed with sample data
  const cal = freshCalendar('My Calendar', normalizeAppData(defaultData));
  return { calendars: [cal], activeCalendarId: cal.id };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<Store>(loadStore);

  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    try { return localStorage.getItem(BACKUP_TS_KEY); } catch { return null; }
  });

  const recordBackup = () => {
    const ts = new Date().toISOString();
    try { localStorage.setItem(BACKUP_TS_KEY, ts); } catch { /* storage full */ }
    setLastBackupAt(ts);
  };

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [store]);

  const activeCalendar =
    store.calendars.find(c => c.id === store.activeCalendarId) ?? store.calendars[0];
  const data = activeCalendar.data;

  // Helper: mutate the active calendar's data immutably
  const mutate = (fn: (d: AppData) => AppData) => {
    setStore(prev => ({
      ...prev,
      calendars: prev.calendars.map(c =>
        c.id === prev.activeCalendarId ? { ...c, data: fn(c.data) } : c
      ),
    }));
  };

  // ── Events ──
  const addEvent = (event: Event) => mutate(d => ({ ...d, events: [...d.events, event] }));
  const updateEvent = (id: string, update: Partial<Event>) =>
    mutate(d => ({ ...d, events: d.events.map(e => (e.id === id ? { ...e, ...update } : e)) }));
  const deleteEvent = (id: string) =>
    mutate(d => ({ ...d, events: d.events.filter(e => e.id !== id) }));

  // ── Tasks ──
  const addTask = (task: Task) => mutate(d => ({ ...d, tasks: [...d.tasks, task] }));
  const updateTask = (id: string, update: Partial<Task>) =>
    mutate(d => ({ ...d, tasks: d.tasks.map(t => (t.id === id ? { ...t, ...update } : t)) }));
  const deleteTask = (id: string) =>
    mutate(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));

  // ── Person events ──
  const addPersonEvent = (event: PersonEvent) =>
    mutate(d => ({ ...d, personEvents: [...d.personEvents, event] }));
  const updatePersonEvent = (id: string, update: Partial<PersonEvent>) =>
    mutate(d => ({ ...d, personEvents: d.personEvents.map(e => (e.id === id ? { ...e, ...update } : e)) }));
  const deletePersonEvent = (id: string) =>
    mutate(d => ({ ...d, personEvents: d.personEvents.filter(e => e.id !== id) }));

  // ── Categories ──
  const addCategory = (category: Category) =>
    mutate(d => ({ ...d, categories: [...d.categories, category] }));
  const updateCategory = (id: string, update: Partial<Category>) =>
    mutate(d => {
      const next = { ...d, categories: d.categories.map(c => (c.id === id ? { ...c, ...update } : c)) };
      // Keep event/task colors in sync if the category color changed
      if (update.color) {
        next.events = next.events.map(e => (e.category === id ? { ...e, color: update.color! } : e));
      }
      return next;
    });
  const deleteCategory = (id: string) =>
    mutate(d => {
      if (id === 'other') return d; // keep the fallback
      const otherColor = d.categories.find(c => c.id === 'other')?.color ?? '#6b7280';
      return {
        ...d,
        categories: d.categories.filter(c => c.id !== id),
        events: d.events.map(e => (e.category === id ? { ...e, category: 'other', color: otherColor } : e)),
        tasks: d.tasks.map(t => (t.category === id ? { ...t, category: 'other' } : t)),
      };
    });

  const reorderCategories = (fromIndex: number, toIndex: number) =>
    mutate(d => {
      const cats = [...d.categories];
      const [moved] = cats.splice(fromIndex, 1);
      cats.splice(toIndex, 0, moved);
      return { ...d, categories: cats };
    });

  // ── People ──
  const addPerson = (person: Person) => mutate(d => ({ ...d, people: [...d.people, person] }));
  const updatePerson = (id: string, update: Partial<Person>) =>
    mutate(d => {
      const next = { ...d, people: d.people.map(p => (p.id === id ? { ...p, ...update } : p)) };
      if (update.color) {
        next.personEvents = next.personEvents.map(pe =>
          pe.person === id ? { ...pe, color: update.color! } : pe
        );
      }
      return next;
    });
  const deletePerson = (id: string) =>
    mutate(d => ({
      ...d,
      people: d.people.filter(p => p.id !== id),
      personEvents: d.personEvents.filter(pe => pe.person !== id),
    }));

  // ── Projects ──
  const addProject = (project: Project) =>
    mutate(d => ({ ...d, projects: [...d.projects, project] }));
  const updateProject = (id: string, update: Partial<Project>) =>
    mutate(d => ({ ...d, projects: d.projects.map(p => (p.id === id ? { ...p, ...update } : p)) }));
  const deleteProject = (id: string) =>
    mutate(d => ({
      ...d,
      projects: d.projects.filter(p => p.id !== id),
      // Detach tasks from deleted project
      tasks: d.tasks.map(t => (t.projectId === id ? { ...t, projectId: null } : t)),
    }));

  // ── Calendar versioning ──
  const createCalendar = (name: string, seed: 'empty' | 'sample' | 'duplicate' = 'empty'): string => {
    const seedData =
      seed === 'sample'
        ? normalizeAppData(defaultData)
        : seed === 'duplicate'
        ? JSON.parse(JSON.stringify(activeCalendar.data))
        : ({
            events: [],
            tasks: [],
            personEvents: [],
            categories: activeCalendar.data.categories.map(c => ({ ...c })),
            people: activeCalendar.data.people.map(p => ({ ...p })),
            projects: activeCalendar.data.projects.map(p => ({ ...p })),
          } as AppData);
    const cal = freshCalendar(name || 'Untitled Calendar', seedData);
    setStore(prev => ({ calendars: [...prev.calendars, cal], activeCalendarId: cal.id }));
    return cal.id;
  };

  const duplicateCalendar = (id: string, name?: string): string => {
    const src = store.calendars.find(c => c.id === id) ?? activeCalendar;
    const cal = freshCalendar(name || `${src.name} (copy)`, JSON.parse(JSON.stringify(src.data)));
    setStore(prev => ({ calendars: [...prev.calendars, cal], activeCalendarId: cal.id }));
    return cal.id;
  };

  const renameCalendar = (id: string, name: string) =>
    setStore(prev => ({
      ...prev,
      calendars: prev.calendars.map(c => (c.id === id ? { ...c, name } : c)),
    }));

  const deleteCalendar = (id: string) =>
    setStore(prev => {
      if (prev.calendars.length <= 1) return prev; // never delete the last calendar
      const remaining = prev.calendars.filter(c => c.id !== id);
      const activeCalendarId =
        prev.activeCalendarId === id ? remaining[0].id : prev.activeCalendarId;
      return { calendars: remaining, activeCalendarId };
    });

  const switchCalendar = (id: string) =>
    setStore(prev =>
      prev.calendars.some(c => c.id === id) ? { ...prev, activeCalendarId: id } : prev
    );

  // ── Import update (optionally into a brand-new version) ──
  const applyUpdateToData = (d: AppData, update: any): { data: AppData; warnings: string[] } => {
    const applyWarnings: string[] = [];
    const catIds = new Set(d.categories.map(c => c.id));
    const catColor = (id: string) =>
      d.categories.find(c => c.id === id)?.color ?? d.categories.find(c => c.id === 'other')?.color ?? '#6b7280';

    // Coerce a merged event so an invalid category falls back to "other" and a
    // category change recolors unless the update explicitly supplied a color.
    const sanitizeEvent = (merged: Event, up: any): Event => {
      const category = catIds.has(merged.category) ? merged.category : 'other';
      const explicitColor = typeof up?.color === 'string' && up.color.trim();
      return { ...merged, category, color: explicitColor ? up.color : catColor(category) };
    };
    const sanitizeTask = (merged: Task, projectIds: Set<string>): Task => ({
      ...merged,
      category: catIds.has(merged.category) ? merged.category : 'other',
      projectId: merged.projectId && projectIds.has(merged.projectId) ? merged.projectId : null,
    });

    const next: AppData = {
      ...d,
      categories: [...d.categories],
      people: [...d.people],
      personEvents: [...d.personEvents],
      projects: [...d.projects],
      events: [...d.events],
      tasks: [...d.tasks],
    };

    // Canonical v3 imports create parents before dependent records. Required
    // fallback category is never modified by AI imports.
    if (update.categories) {
      if (Array.isArray(update.categories.add)) next.categories = [...next.categories, ...update.categories.add.filter((c: Category) => !next.categories.some(existing => existing.id === c.id))];
      if (Array.isArray(update.categories.update)) next.categories = next.categories.map(c => c.id === 'other' ? c : ({ ...c, ...(update.categories.update.find((u: any) => u.id === c.id) ?? {}) }));
    }
    if (update.people) {
      if (Array.isArray(update.people.add)) next.people = [...next.people, ...update.people.add.filter((p: Person) => !next.people.some(existing => existing.id === p.id))];
      if (Array.isArray(update.people.update)) next.people = next.people.map(p => ({ ...p, ...(update.people.update.find((u: any) => u.id === p.id) ?? {}) }));
    }
    if (update.peopleSchedule) {
      const peopleIds = new Set(next.people.map(p => p.id));
      if (Array.isArray(update.peopleSchedule.add)) next.personEvents = [...next.personEvents, ...update.peopleSchedule.add.filter((e: PersonEvent) => peopleIds.has(e.person) && !next.personEvents.some(existing => existing.id === e.id))];
      if (Array.isArray(update.peopleSchedule.update)) next.personEvents = next.personEvents.map(e => ({ ...e, ...(update.peopleSchedule.update.find((u: any) => u.id === e.id) ?? {}) }));
    }
    catIds.clear(); next.categories.forEach(c => catIds.add(c.id));

    // Apply project operations first so task projectId values can be sanitized
    // against the final project set. Deleting a project keeps tasks and detaches
    // them, matching manual project deletion behavior.
    if (update.projects) {
      if (Array.isArray(update.projects.add)) next.projects = [...next.projects, ...update.projects.add];
      if (Array.isArray(update.projects.update)) {
        next.projects = next.projects.map(p => {
          const up = update.projects.update.find((u: any) => u.id === p.id);
          return up ? { ...p, ...up } : p;
        });
      }
      if (Array.isArray(update.projects.delete)) {
        const deletedIds = new Set(update.projects.delete);
        next.projects = next.projects.filter(p => !deletedIds.has(p.id));
        next.tasks = next.tasks.map(t => t.projectId && deletedIds.has(t.projectId) ? { ...t, projectId: null } : t);
      }
    }

    const projectIds = new Set(next.projects.map(p => p.id));

    if (update.events) {
      if (Array.isArray(update.events.add)) next.events = [...next.events, ...update.events.add];
      if (Array.isArray(update.events.update)) {
        next.events = next.events.map(e => {
          const up = update.events.update.find((u: any) => u.id === e.id);
          return up ? sanitizeEvent({ ...e, ...up }, up) : e;
        });
      }
      if (Array.isArray(update.events.delete)) {
        const BLOCKED_DIRECT_DELETE = new Set<EventKind>(['fixed-appointment', 'shift', 'travel', 'day-type', 'protected-time']);
        const toDelete = new Set<string>();
        for (const id of update.events.delete) {
          const ev = next.events.find(e => e.id === id);
          if (!ev) continue;
          if (!ev.eventKind || BLOCKED_DIRECT_DELETE.has(ev.eventKind)) {
            applyWarnings.push(`Blocked delete of "${ev.title}" (${ev.eventKind ?? 'unknown eventKind'}) — only flexible-work-block, reminder, or placeholder may be auto-deleted`);
            continue;
          }
          toDelete.add(id);
        }
        next.events = next.events.filter(e => !toDelete.has(e.id));
      }
    }
    if (update.tasks) {
      if (Array.isArray(update.tasks.add)) {
        next.tasks = [...next.tasks, ...update.tasks.add.map((t: Task) => sanitizeTask(t, projectIds))];
      }
      if (Array.isArray(update.tasks.update)) {
        next.tasks = next.tasks.map(t => {
          const up = update.tasks.update.find((u: any) => u.id === t.id);
          return up ? sanitizeTask({ ...t, ...up }, projectIds) : t;
        });
      }
      if (Array.isArray(update.tasks.delete)) {
        next.tasks = next.tasks.filter(t => !update.tasks.delete.includes(t.id));
      }
    }
    return { data: next, warnings: applyWarnings };
  };

  const applyImportUpdate = (
    update: any,
    transformationArgs?: { proposals: TransformationProposalSet; approvedProposalIds: Set<string> },
    target?: { newVersionName?: string }
  ): string[] => {
    const allWarnings: string[] = [];
    // Revalidate selected references against current data before any mutation.
    const allSelected = new Set<string>();
    ['categories', 'people', 'projects', 'tasks', 'events', 'peopleSchedule'].forEach(group => ['add', 'update'].forEach(operation => ((update[group]?.[operation] ?? []) as any[]).forEach((record: any, index: number) => allSelected.add(`${group}:${operation}:${record.id}:${index}`))));
    const dependencyCheck = analyzeDependencies(update, activeCalendar.data, allSelected);
    if (dependencyCheck.blocked.size) throw new Error([...dependencyCheck.blocked.values()].join('; '));
    const shouldTransform = !!(
      transformationArgs &&
      transformationArgs.approvedProposalIds.size > 0 &&
      (transformationArgs.proposals.mergeIntoDayType.length > 0 || transformationArgs.proposals.convertTimedBlockToTask.length > 0)
    );

    if (target?.newVersionName) {
      const copy = JSON.parse(JSON.stringify(activeCalendar.data)) as AppData;
      const { data: afterDirect, warnings: w1 } = applyUpdateToData(copy, update);
      allWarnings.push(...w1);
      const { data: finalData, warnings: w2 } = shouldTransform
        ? applyTransformationProposals(afterDirect, transformationArgs!.proposals, transformationArgs!.approvedProposalIds)
        : { data: afterDirect, warnings: [] };
      allWarnings.push(...w2);
      const cal = freshCalendar(target.newVersionName, finalData);
      setStore(prev => ({ calendars: [...prev.calendars, cal], activeCalendarId: cal.id }));
    } else {
      mutate(d => {
        const { data: afterDirect, warnings: w1 } = applyUpdateToData(d, update);
        allWarnings.push(...w1);
        const { data: finalData, warnings: w2 } = shouldTransform
          ? applyTransformationProposals(afterDirect, transformationArgs!.proposals, transformationArgs!.approvedProposalIds)
          : { data: afterDirect, warnings: [] };
        allWarnings.push(...w2);
        return finalData;
      });
    }
    return allWarnings;
  };

  // ── Backup / restore ──
  const exportBackup = (): string =>
    JSON.stringify({ app: 'lifegrid', version: 5, exportedAt: new Date().toISOString(), store }, null, 2);

  const importBackup = (json: string) => {
    const parsed = JSON.parse(json);
    const incoming = parsed?.store ?? parsed;
    if (incoming && Array.isArray(incoming.calendars) && incoming.calendars.length) {
      const calendars: Calendar[] = incoming.calendars.map((c: any) => ({
        id: c.id ?? uid(),
        name: c.name ?? 'Calendar',
        createdAt: c.createdAt ?? new Date().toISOString(),
        data: normalizeAppData(c.data),
      }));
      const aid = typeof incoming.activeCalendarId === 'string' && calendars.some(c => c.id === incoming.activeCalendarId)
        ? incoming.activeCalendarId
        : calendars[0].id;
      setStore({ calendars, activeCalendarId: aid });
    } else if (incoming && (incoming.events || incoming.tasks)) {
      // A single AppData blob — import as a new calendar version
      const cal = freshCalendar('Imported Calendar', normalizeAppData(incoming));
      setStore(prev => ({ calendars: [...prev.calendars, cal], activeCalendarId: cal.id }));
    } else {
      throw new Error('Unrecognized backup format.');
    }
  };

  const clearActiveCalendar = () =>
    mutate(d => ({ ...d, events: [], tasks: [], personEvents: [] }));

  // ── Recurring / multi-day group deletes ──
  const deleteEventGroup = (groupId: string) =>
    mutate(d => ({ ...d, events: d.events.filter(e => e.recurringGroupId !== groupId) }));
  const deleteTaskGroup = (groupId: string) =>
    mutate(d => ({ ...d, tasks: d.tasks.filter(t => t.recurringGroupId !== groupId) }));
  const deletePersonEventGroup = (groupId: string) =>
    mutate(d => ({ ...d, personEvents: d.personEvents.filter(pe => pe.recurringGroupId !== groupId) }));

  return (
    <AppContext.Provider
      value={{
        ...data,
        calendars: store.calendars,
        activeCalendarId: store.activeCalendarId,
        activeCalendar,
        addEvent, updateEvent, deleteEvent,
        addTask, updateTask, deleteTask,
        addPersonEvent, updatePersonEvent, deletePersonEvent,
        addCategory, updateCategory, deleteCategory, reorderCategories,
        addPerson, updatePerson, deletePerson,
        addProject, updateProject, deleteProject,
        createCalendar, renameCalendar, deleteCalendar, switchCalendar, duplicateCalendar,
        applyImportUpdate, exportBackup, importBackup, clearActiveCalendar,
        lastBackupAt, recordBackup,
        deleteEventGroup, deleteTaskGroup, deletePersonEventGroup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppData must be used within AppProvider');
  return context;
};
