import type { Event, Project, Task } from '../types';
import { getLocalTemporalOccurrence } from './temporal.js';

/** Pure indexes shared by views and benchmark tooling. None of these mutate inputs. */
export const indexEventsByDisplayedDate = (events: readonly Event[], timeZone: string, compare: (a: Event, b: Event) => number) => {
  const byDate = new Map<string, Event[]>();
  for (const event of events) {
    const date = getLocalTemporalOccurrence(event).displayedStartDate;
    const bucket = byDate.get(date);
    if (bucket) bucket.push(event); else byDate.set(date, [event]);
  }
  byDate.forEach(bucket => bucket.sort(compare));
  return byDate;
};

export const indexTasks = (tasks: readonly Task[]) => {
  const byId = new Map<string, Task>();
  const children = new Map<string, Task[]>();
  const byLinkedEvent = new Map<string, Task[]>();
  for (const task of tasks) {
    byId.set(task.id, task);
    if (task.parentTaskId) { const list = children.get(task.parentTaskId) ?? []; list.push(task); children.set(task.parentTaskId, list); }
    for (const eventId of task.linkedEventIds ?? []) { const list = byLinkedEvent.get(eventId) ?? []; list.push(task); byLinkedEvent.set(eventId, list); }
  }
  return { byId, children, byLinkedEvent };
};

export interface ProjectUsage { openTasks: number; completedTasks: number; totalTasks: number; relatedEvents: number; }
export const indexProjectUsage = (projects: readonly Project[], tasks: readonly Task[], events: readonly Event[]): Record<string, ProjectUsage> => {
  const usage: Record<string, ProjectUsage> = Object.fromEntries(projects.map(project => [project.id, { openTasks: 0, completedTasks: 0, totalTasks: 0, relatedEvents: 0 }]));
  const taskProject = new Map<string, string | null>(tasks.map(task => [task.id, task.projectId ?? null]));
  for (const task of tasks) { const value = task.projectId ? usage[task.projectId] : undefined; if (value) { value.totalTasks++; task.status === 'done' ? value.completedTasks++ : value.openTasks++; } }
  for (const event of events) for (const id of new Set((event.linkedTaskIds ?? []).map(taskId => taskProject.get(taskId)).filter((id): id is string => !!id && !!usage[id]))) usage[id].relatedEvents++;
  return usage;
};
