import type { AppData, Event, ImportUpdate, Task } from '../types';

export interface AIExportScope { mode: 'all' | 'range'; start?: string; end?: string }
export const cloneAIExportData = (data: AppData): AppData => ({
  categories: structuredClone(data.categories ?? []),
  projects: structuredClone(data.projects ?? []),
  people: structuredClone(data.people ?? []),
  events: structuredClone(data.events ?? []),
  personEvents: structuredClone(data.personEvents ?? []),
  tasks: structuredClone(data.tasks ?? []),
  milestones: structuredClone(data.milestones ?? []),
});
const intersects = (date: string, endDate: string | null | undefined, start: string, end: string) =>
  date <= end && (endDate && endDate >= date ? endDate : date) >= start;

/** Complete is the default. A range retains catalogs and undated tasks by contract. */
export const selectAIExportData = (data: AppData, scope: AIExportScope = { mode: 'all' }): AppData => {
  if (scope.mode === 'all') return cloneAIExportData(data);
  const start = scope.start ?? '', end = scope.end ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) throw new Error('Choose a valid export date range.');
  return {
    categories: structuredClone(data.categories ?? []), projects: structuredClone(data.projects ?? []), people: structuredClone(data.people ?? []),
    events: (data.events ?? []).filter(e => intersects(e.date, e.endDate, start, end)).map(e => structuredClone(e)),
    personEvents: (data.personEvents ?? []).filter(e => intersects(e.date, e.endDate, start, end)).map(e => structuredClone(e)),
    tasks: (data.tasks ?? []).filter(t => !t.dueDate || (t.dueDate >= start && t.dueDate <= end)).map(t => structuredClone(t)),
    milestones: (data.milestones ?? []).filter(m => !!m.targetDate && m.targetDate >= start && m.targetDate <= end).map(m => structuredClone(m)),
  };
};

export const aiExportManifest = (data: AppData, scope: AIExportScope = { mode: 'all' }) => ({
  scope: scope.mode, inclusionRules: scope.mode === 'all' ? 'Complete LifeGrid, including completed and undated Tasks.' : 'Full catalogs and undated Tasks; dated records intersect the inclusive range.',
  versions: { app: 'v0.5.28', interchange: 5, backup: 7 },
  counts: Object.fromEntries((['categories','projects','people','events','personEvents','tasks','milestones'] as const).map(key => [key, data[key].length])),
});

export const AI_RELATIONSHIP_WARNING = 'AI hard relationships were ignored; use Projects, Tags, and notes for context.';
/** Sanitize only AI proposals: stored/manual/backup relationships remain untouched. */
export const sanitizeAIRelationships = (update: ImportUpdate) => {
  let ignored = false;
  const taskAdd = (task: Task): Task => { ignored ||= !!task.parentTaskId || !!task.linkedEventIds?.length; return { ...task, parentTaskId: null, linkedEventIds: [] }; };
  const eventAdd = (event: Event): Event => { ignored ||= !!event.linkedTaskIds?.length; return { ...event, linkedTaskIds: [] }; };
  const taskUpdate = (task: Partial<Task> & { id: string }) => { const { parentTaskId, linkedEventIds, ...safe } = task; ignored ||= parentTaskId !== undefined || linkedEventIds !== undefined; return safe; };
  const eventUpdate = (event: Partial<Event> & { id: string }) => { const { linkedTaskIds, ...safe } = event; ignored ||= linkedTaskIds !== undefined; return safe; };
  const value: ImportUpdate = { ...update,
    tasks: update.tasks && { ...update.tasks, add: update.tasks.add?.map(taskAdd), update: update.tasks.update?.map(taskUpdate) },
    events: update.events && { ...update.events, add: update.events.add?.map(eventAdd), update: update.events.update?.map(eventUpdate) },
  };
  return { value, warnings: ignored ? [AI_RELATIONSHIP_WARNING] : [] };
};

export const validateEventProject = (projectId: string | null | undefined, projectIds: ReadonlySet<string>) =>
  projectId == null || projectIds.has(projectId) ? { ok: true as const, value: projectId ?? null } : { ok: false as const, error: `Event references unknown projectId "${projectId}".` };
