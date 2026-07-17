import type { AppData } from '../types';
import { analyzeDependencies } from './aiDependencies.js';

const groups = ['categories', 'people', 'projects', 'tasks', 'events', 'peopleSchedule'] as const;
const collection: Record<string, keyof AppData> = { categories: 'categories', people: 'people', projects: 'projects', tasks: 'tasks', events: 'events', peopleSchedule: 'personEvents' };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Applies a reviewed patch to an isolated working copy.  It never writes input objects. */
export function applyPatchAtomically(currentData: AppData, patch: any) {
  const selected = new Set<string>();
  groups.forEach(g => ['add', 'update'].forEach(op => (patch?.[g]?.[op] ?? []).forEach((r: any, i: number) => selected.add(`${g}:${op}:${r.id}:${i}`))));
  const dependency = analyzeDependencies(patch, currentData, selected);
  if (dependency.blocked.size) throw new Error([...dependency.blocked.values()].join('; '));
  const next = clone(currentData); const addIds = new Map<string, Set<string>>();
  for (const group of groups) {
    const records: any[] = (next[collection[group]] as any[]) ?? [];
    const known = new Set(records.map(r => r.id)); const proposed = new Set<string>();
    for (const record of patch?.[group]?.add ?? []) {
      if (!record?.id || known.has(record.id) || proposed.has(record.id)) throw new Error(`Duplicate ${group} add id: ${record?.id ?? 'missing'}`);
      proposed.add(record.id);
    }
    addIds.set(group, proposed);
    for (const record of patch?.[group]?.update ?? []) {
      if (!record?.id || !known.has(record.id)) throw new Error(`Cannot update missing ${group} id: ${record?.id ?? 'missing'}`);
      if (group === 'categories' && record.id === 'other') throw new Error('The protected Other category cannot be updated by an AI patch.');
    }
  }
  // Parent-first order is intentional: categories, people, projects, tasks, events, schedule.
  for (const group of groups) {
    const key = collection[group]; const records: any[] = next[key] as any[];
    const additions = (patch?.[group]?.add ?? []).map(clone);
    const updates = new Map((patch?.[group]?.update ?? []).map((r: any) => [r.id, r]));
    (next as any)[key] = [...records.map(r => updates.has(r.id) ? { ...r, ...(clone(updates.get(r.id)) as any) } : r), ...additions];
  }
  validateReferences(next);
  return { data: next, warnings: [] as string[], appliedKeys: [...selected], skippedKeys: [] as string[] };
}

export function validateReferences(data: AppData) {
  const cats = new Set(data.categories.map(x => x.id)); const people = new Set(data.people.map(x => x.id)); const projects = new Set(data.projects.map(x => x.id)); const tasks = new Set(data.tasks.map(x => x.id)); const events = new Set(data.events.map(x => x.id));
  if (!cats.has('other')) throw new Error('The required Other category is missing.');
  data.events.forEach(e => { if (!cats.has(e.category)) throw new Error(`Event ${e.id} has an orphan category.`); (e.linkedTaskIds ?? []).forEach(id => { if (!tasks.has(id)) throw new Error(`Event ${e.id} has an orphan linked task.`); }); });
  data.tasks.forEach(t => { if (!cats.has(t.category)) throw new Error(`Task ${t.id} has an orphan category.`); if (t.projectId && !projects.has(t.projectId)) throw new Error(`Task ${t.id} has an orphan project.`); if (t.parentTaskId && !tasks.has(t.parentTaskId)) throw new Error(`Task ${t.id} has an orphan parent task.`); (t.linkedEventIds ?? []).forEach(id => { if (!events.has(id)) throw new Error(`Task ${t.id} has an orphan linked event.`); }); });
  data.personEvents.forEach(p => { if (!people.has(p.person)) throw new Error(`People Schedule ${p.id} has an orphan person.`); });
  const visit = (id: string, path = new Set<string>()): void => { if (path.has(id)) throw new Error('Task parent relationship contains a cycle.'); const task = data.tasks.find(t => t.id === id); if (task?.parentTaskId) { const next = new Set(path); next.add(id); visit(task.parentTaskId, next); } }; data.tasks.forEach(t => visit(t.id));
}
