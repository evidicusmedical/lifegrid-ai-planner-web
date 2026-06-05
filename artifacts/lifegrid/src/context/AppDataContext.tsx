import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Event, Task, PersonEvent, Category, Person, Calendar, Store } from '../types';
import { defaultData, DEFAULT_CATEGORIES, DEFAULT_PEOPLE } from '../lib/sampleData';

interface AppContextType extends AppData {
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

  // Category CRUD
  addCategory: (category: Category) => void;
  updateCategory: (id: string, update: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Person CRUD
  addPerson: (person: Person) => void;
  updatePerson: (id: string, update: Partial<Person>) => void;
  deletePerson: (id: string) => void;

  // Calendar versioning
  createCalendar: (name: string, seed?: 'empty' | 'sample' | 'duplicate') => string;
  renameCalendar: (id: string, name: string) => void;
  deleteCalendar: (id: string) => void;
  switchCalendar: (id: string) => void;
  duplicateCalendar: (id: string, name?: string) => string;

  // Import / backup
  applyImportUpdate: (update: any, target?: { newVersionName?: string }) => void;
  exportBackup: () => string;
  importBackup: (json: string) => void;
  clearActiveCalendar: () => void;

  // Recurring / multi-day group deletes
  deleteEventGroup: (groupId: string) => void;
  deleteTaskGroup: (groupId: string) => void;
  deletePersonEventGroup: (groupId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORE_KEY = 'lifegrid_store_v5';
const LEGACY_KEY = 'lifegrid_data';

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Ensure an AppData blob has all required collections ──────────────────────
const normalizeAppData = (raw: any): AppData => {
  const data: AppData = {
    events: Array.isArray(raw?.events) ? raw.events : [],
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : [],
    personEvents: Array.isArray(raw?.personEvents) ? raw.personEvents : [],
    categories: Array.isArray(raw?.categories) && raw.categories.length
      ? raw.categories
      : DEFAULT_CATEGORIES.map(c => ({ ...c })),
    // People may be intentionally empty — only fall back to defaults when the
    // field is entirely missing/invalid (fresh install / legacy migration).
    people: Array.isArray(raw?.people)
      ? raw.people
      : DEFAULT_PEOPLE.map(p => ({ ...p })),
  };
  // Make sure every event/task category exists; fall back to "other".
  const catIds = new Set(data.categories.map(c => c.id));
  if (!catIds.has('other')) {
    data.categories.push({ id: 'other', label: 'Other', color: '#6b7280' });
    catIds.add('other');
  }
  data.events = data.events.map(e => ({ ...e, category: catIds.has(e.category) ? e.category : 'other' }));
  data.tasks = data.tasks.map(t => ({
    ...t,
    category: catIds.has(t.category) ? t.category : 'other',
    schedulingNotes: t.schedulingNotes ?? null,
  }));
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
  const applyUpdateToData = (d: AppData, update: any): AppData => {
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
    const sanitizeTask = (merged: Task): Task => ({
      ...merged,
      category: catIds.has(merged.category) ? merged.category : 'other',
    });

    const next = { ...d };
    if (update.events) {
      if (Array.isArray(update.events.add)) next.events = [...next.events, ...update.events.add];
      if (Array.isArray(update.events.update)) {
        next.events = next.events.map(e => {
          const up = update.events.update.find((u: any) => u.id === e.id);
          return up ? sanitizeEvent({ ...e, ...up }, up) : e;
        });
      }
      if (Array.isArray(update.events.delete)) {
        next.events = next.events.filter(e => !update.events.delete.includes(e.id));
      }
    }
    if (update.tasks) {
      if (Array.isArray(update.tasks.add)) next.tasks = [...next.tasks, ...update.tasks.add];
      if (Array.isArray(update.tasks.update)) {
        next.tasks = next.tasks.map(t => {
          const up = update.tasks.update.find((u: any) => u.id === t.id);
          return up ? sanitizeTask({ ...t, ...up }) : t;
        });
      }
      if (Array.isArray(update.tasks.delete)) {
        next.tasks = next.tasks.filter(t => !update.tasks.delete.includes(t.id));
      }
    }
    return next;
  };

  const applyImportUpdate = (update: any, target?: { newVersionName?: string }) => {
    if (target?.newVersionName) {
      // Apply changes into a NEW calendar version (a copy of the current one)
      const copy = JSON.parse(JSON.stringify(activeCalendar.data)) as AppData;
      const updated = applyUpdateToData(copy, update);
      const cal = freshCalendar(target.newVersionName, updated);
      setStore(prev => ({ calendars: [...prev.calendars, cal], activeCalendarId: cal.id }));
    } else {
      mutate(d => applyUpdateToData(d, update));
    }
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
      setStore({ calendars, activeCalendarId: calendars[0].id });
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
        addCategory, updateCategory, deleteCategory,
        addPerson, updatePerson, deletePerson,
        createCalendar, renameCalendar, deleteCalendar, switchCalendar, duplicateCalendar,
        applyImportUpdate, exportBackup, importBackup, clearActiveCalendar,
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
