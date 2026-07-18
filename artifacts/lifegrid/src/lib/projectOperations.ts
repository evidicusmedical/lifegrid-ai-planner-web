import type { Event, Milestone, Project, Task } from '../types';

const dateOnly = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
/** Preserve legacy milestone records for schema-6 backup compatibility. Milestones have no UI in v0.5.2. */
export const normalizeMilestones = (raw: unknown, projectIds: Iterable<string>): Milestone[] => {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(projectIds), ids = new Set<string>();
  return raw.map((m: any, index) => {
    const id = typeof m?.id === 'string' && m.id ? m.id : `milestone-${index}`;
    if (ids.has(id)) throw new Error(`Duplicate milestone id: ${id}`); ids.add(id);
    if (!allowed.has(m?.projectId)) throw new Error(`Milestone ${id} has an orphan project.`);
    return { id, projectId: m.projectId, title: typeof m.title === 'string' && m.title.trim() ? m.title.trim() : 'Untitled milestone', targetDate: dateOnly(m.targetDate), status: m.status === 'completed' ? 'completed' as const : 'planned' as const, completedDate: dateOnly(m.completedDate), notes: typeof m.notes === 'string' && m.notes.trim() ? m.notes : null, order: Number.isFinite(Number(m.order)) ? Number(m.order) : index };
  }).sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)).map((m, order) => ({ ...m, order }));
};
export const normalizeProjectName = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizeAliases = (aliases: readonly string[] | string): string[] => { const values: readonly string[] = typeof aliases === 'string' ? aliases.split(',') : aliases; return [...new Set(values.map(normalizeProjectName).filter(Boolean).map((x: string) => x.toLocaleLowerCase()))]; };
export const validateProjectTag = (draft: Pick<Project, 'name'|'color'|'aliases'>, projects: readonly Project[], editingId?: string) => {
  const name = normalizeProjectName(draft.name); if (!name) return { ok: false as const, error: 'Project Tag name is required.' };
  const folded = name.toLocaleLowerCase();
  if (projects.some(p => p.id !== editingId && normalizeProjectName(p.name).toLocaleLowerCase() === folded)) return { ok: false as const, error: 'A Project Tag with that name already exists.' };
  const nameAliasConflict = projects.find(p => p.id !== editingId && (p.aliases ?? []).map(normalizeProjectName).some(alias => alias.toLocaleLowerCase() === folded));
  if (nameAliasConflict) return { ok: false as const, error: `Project Tag name conflicts with alias on “${nameAliasConflict.name}”.` };
  const aliases = normalizeAliases(draft.aliases ?? []);
  const conflicts = projects.filter(p => p.id !== editingId).find(p => [p.name, ...(p.aliases ?? [])].map(normalizeProjectName).some(v => aliases.includes(v.toLocaleLowerCase())));
  if (conflicts) return { ok: false as const, error: `Alias conflicts with Project Tag “${conflicts.name}”.` };
  return { ok: true as const, value: { name, color: draft.color, aliases } };
};
export const sortProjectTags = (projects: readonly Project[]) => [...projects].sort((a,b) => (a.order ?? 0)-(b.order ?? 0) || a.name.localeCompare(b.name));
export const findProjectTagOptions = (projects: readonly Project[], query: string, selectedId?: string | null, includeArchived = false) => {
  const q = query.trim().toLocaleLowerCase(); return sortProjectTags(projects).filter(p => (includeArchived || p.status !== 'archived' || p.id === selectedId) && (!q || [p.name, ...(p.aliases ?? [])].some(x => x.toLocaleLowerCase().includes(q))));
};
/** Shared guard for the compact Task editor creation flow. */
export const projectTagQuickCreateValidation = (query: string, projects: readonly Project[]) =>
  query.trim() ? validateProjectTag({ name: query, color: '#2563eb', aliases: [] }, projects) : { ok: false as const, error: 'Enter a Project Tag name first.' };
export interface ProjectTagUsage { openTasks: number; completedTasks: number; totalTasks: number; relatedEvents: number; }
export const projectTagUsage = (projects: readonly Project[], tasks: readonly Task[], events: readonly Event[]): Record<string, ProjectTagUsage> => {
  const result: Record<string, ProjectTagUsage> = Object.fromEntries(projects.map(p => [p.id, {openTasks:0,completedTasks:0,totalTasks:0,relatedEvents:0}]));
  const taskProject = new Map(tasks.map(t => [t.id, t.projectId]));
  tasks.forEach(t => { const usage = t.projectId ? result[t.projectId] : undefined; if (usage) { usage.totalTasks++; t.status === 'done' ? usage.completedTasks++ : usage.openTasks++; } });
  events.forEach(e => new Set((e.linkedTaskIds ?? []).map(id => taskProject.get(id)).filter((id): id is string => !!id && !!result[id])).forEach(id => result[id].relatedEvents++));
  return result;
};
export const eventProjectTags = (event: Event, tasks: readonly Task[], projects: readonly Project[]) => {
  const taskProjects = new Map(tasks.map(t => [t.id, t.projectId])); const ids = new Set((event.linkedTaskIds ?? []).map(id => taskProjects.get(id)).filter((id): id is string => !!id));
  return sortProjectTags(projects).filter(p => ids.has(p.id));
};
export type ProjectDeletionPolicy = 'clear' | 'reassign';
export const planProjectTagDeletion = (data: { projects: readonly Project[]; tasks: readonly Task[]; events: readonly Event[]; milestones: readonly Milestone[] }, sourceId: string, policy?: ProjectDeletionPolicy, destinationId?: string) => {
  const source = data.projects.find(p => p.id === sourceId); if (!source) return { ok:false as const, error:'Project Tag was not found.' };
  if (data.milestones.some(m => m.projectId === sourceId)) return { ok:false as const, error:'This Project Tag has preserved legacy milestones. Archive it instead; deletion is blocked to preserve legacy data.' };
  const used = data.tasks.some(t => t.projectId === sourceId); if (used && !policy) return { ok:false as const, error:'Choose clear or reassign before deleting a used Project Tag.' };
  if (policy === 'reassign') { const destination = data.projects.find(p => p.id === destinationId); if (!destination || destination.id === sourceId || destination.status === 'archived') return { ok:false as const, error:'Choose a different active Project Tag for reassignment.' }; }
  const tasks = data.tasks.map(t => t.projectId !== sourceId ? t : {...t, projectId: policy === 'reassign' ? destinationId! : null});
  if (tasks.some(t => t.projectId && !data.projects.some(p => p.id !== sourceId && p.id === t.projectId))) return { ok:false as const, error:'Final Task Project Tag references are invalid.' };
  return { ok:true as const, value:{ projects:data.projects.filter(p => p.id !== sourceId), tasks, events:[...data.events], milestones:[...data.milestones] } };
};
