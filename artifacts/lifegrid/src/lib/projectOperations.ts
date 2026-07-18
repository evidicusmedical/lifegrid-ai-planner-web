import type { Event, Milestone, Project, Task } from '../types';

export type ProjectHealth = 'on-track' | 'attention' | 'at-risk' | 'complete' | 'no-activity';
export type DashboardSort = 'saved' | 'name' | 'status' | 'progress' | 'milestone' | 'health';
export interface ProjectSummary { project: Project; totalTasks: number; completedTasks: number; openTasks: number; overdueTasks: number; overdueMilestones: number; progress: number; nextAction: Task | null; nextMilestone: Milestone | null; upcomingEvent: Event | null; health: ProjectHealth; healthReason: string; }
const dateOnly = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
export const normalizeMilestones = (raw: unknown, projectIds: Iterable<string>): Milestone[] => {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(projectIds), ids = new Set<string>();
  const clean = raw.map((m: any, index) => {
    const id = typeof m?.id === 'string' && m.id ? m.id : `milestone-${index}`;
    if (ids.has(id)) throw new Error(`Duplicate milestone id: ${id}`); ids.add(id);
    if (!allowed.has(m?.projectId)) throw new Error(`Milestone ${id} has an orphan project.`);
    return { id, projectId: m.projectId, title: typeof m.title === 'string' && m.title.trim() ? m.title.trim() : 'Untitled milestone', targetDate: dateOnly(m.targetDate), status: m.status === 'completed' ? 'completed' as const : 'planned' as const, completedDate: dateOnly(m.completedDate), notes: typeof m.notes === 'string' && m.notes.trim() ? m.notes : null, order: Number.isFinite(Number(m.order)) ? Number(m.order) : index };
  });
  return clean.sort((a,b) => a.order - b.order || a.id.localeCompare(b.id)).map((m, order) => ({ ...m, order }));
};
export const projectProgress = (project: Project, tasks: Task[]) => {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  if (!projectTasks.length) return project.status === 'completed' ? 100 : 0;
  return Math.round(projectTasks.filter(t => t.status === 'done').length / projectTasks.length * 100);
};
export const nextProjectAction = (project: Project, tasks: Task[]): Task | null => {
  const all = tasks.filter(t => t.projectId === project.id && t.status !== 'done' && t.status !== 'blocked');
  if (!all.length) return null;
  return [...all].sort((a,b) => {
    const priority = (t: Task) => t.nextAction ? 0 : t.priority === 'urgent' ? 1 : t.priority === 'high' ? 2 : 3;
    return priority(a)-priority(b) || (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  })[0];
};
export const groupProjectTasks = (project: Project, tasks: Task[], today: string) => {
  const result: Record<'nextActions'|'upcoming'|'overdue'|'unscheduled'|'completed', Task[]> = { nextActions: [], upcoming: [], overdue: [], unscheduled: [], completed: [] };
  const next = nextProjectAction(project, tasks)?.id;
  tasks.filter(t => t.projectId === project.id).forEach(t => { if (t.status === 'done') result.completed.push(t); else if (t.id === next) result.nextActions.push(t); else if (t.dueDate && t.dueDate < today) result.overdue.push(t); else if (t.dueDate) result.upcoming.push(t); else result.unscheduled.push(t); });
  Object.values(result).forEach(group => group.sort((a,b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)));
  return result;
};
export const groupProjectEvents = (project: Project, tasks: Task[], events: Event[], today: string) => {
  const taskIds = new Set(tasks.filter(t => t.projectId === project.id).map(t => t.id)); const seen = new Set<string>();
  const result: Record<'upcoming'|'past'|'unknown'|'approximate', Event[]> = { upcoming: [], past: [], unknown: [], approximate: [] };
  events.forEach(e => { if (seen.has(e.id) || !e.linkedTaskIds?.some(id => taskIds.has(id))) return; seen.add(e.id); if (e.timeStatus === 'unknown') result.unknown.push(e); else if (e.timeStatus === 'approximate') result.approximate.push(e); else if (e.date >= today) result.upcoming.push(e); else result.past.push(e); });
  Object.values(result).forEach(group => group.sort((a,b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.id.localeCompare(b.id))); return result;
};
export const projectSummary = (project: Project, tasks: Task[], milestones: Milestone[], events: Event[], today: string): ProjectSummary => {
  const mine = tasks.filter(t => t.projectId === project.id), done = mine.filter(t => t.status === 'done').length, open = mine.length-done, overdue = mine.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today).length;
  const planned = milestones.filter(m => m.projectId === project.id && m.status === 'planned').sort((a,b)=>(a.targetDate ?? '9999-12-31').localeCompare(b.targetDate ?? '9999-12-31') || a.order-b.order);
  const overdueMilestones = planned.filter(m => m.targetDate && m.targetDate < today).length, nextAction = nextProjectAction(project,tasks), eventGroups = groupProjectEvents(project,tasks,events,today), progress = projectProgress(project,tasks);
  let health: ProjectHealth = 'on-track', healthReason = 'An actionable task or planned work is present.';
  if (project.status === 'completed' || (mine.length > 0 && progress === 100)) { health='complete'; healthReason='Project is completed or all linked tasks are complete.'; }
  else if (overdue + overdueMilestones >= 2) { health='at-risk'; healthReason=`${overdue + overdueMilestones} overdue task or milestone items need attention.`; }
  else if (overdue || overdueMilestones) { health='attention'; healthReason='An incomplete task or planned milestone is overdue.'; }
  else if (!mine.length && !planned.length) { health='no-activity'; healthReason='No linked tasks or planned milestones are available yet.'; }
  else if (!nextAction) { health='attention'; healthReason='No unblocked incomplete task is available as a next action.'; }
  return { project, totalTasks: mine.length, completedTasks: done, openTasks: open, overdueTasks: overdue, overdueMilestones, progress, nextAction, nextMilestone: planned[0] ?? null, upcomingEvent: eventGroups.upcoming[0] ?? null, health, healthReason };
};
export const filterAndSortProjects = (summaries: ProjectSummary[], filters: { search?: string; status?: string; health?: string; category?: string; overdue?: boolean; upcomingMilestone?: boolean; noNextAction?: boolean }, sort: DashboardSort = 'saved') => {
  const search = filters.search?.trim().toLowerCase() ?? '';
  const visible = summaries.filter(s => (!search || s.project.name.toLowerCase().includes(search)) && (!filters.status || filters.status === 'all' || s.project.status === filters.status) && (!filters.health || filters.health === 'all' || s.health === filters.health) && (!filters.category || filters.category === 'all' || s.project.color === filters.category) && (!filters.overdue || s.overdueTasks > 0) && (!filters.upcomingMilestone || !!s.nextMilestone) && (!filters.noNextAction || !s.nextAction));
  const healthOrder: Record<ProjectHealth, number> = {'at-risk':0,attention:1,'no-activity':2,'on-track':3,complete:4};
  return [...visible].sort((a,b) => sort === 'name' ? a.project.name.localeCompare(b.project.name) : sort === 'status' ? a.project.status.localeCompare(b.project.status) || a.project.order-b.project.order : sort === 'progress' ? b.progress-a.progress || a.project.order-b.project.order : sort === 'milestone' ? (a.nextMilestone?.targetDate ?? '9999-12-31').localeCompare(b.nextMilestone?.targetDate ?? '9999-12-31') || a.project.order-b.project.order : sort === 'health' ? healthOrder[a.health]-healthOrder[b.health] || a.project.order-b.project.order : a.project.order-b.project.order || a.project.name.localeCompare(b.project.name));
};
