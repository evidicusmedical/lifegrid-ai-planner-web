import type { AppData } from '../types';
import type { ParsedUpdate } from './aiPrompt';

export type ProposalKey = string;
export type DependencyAnalysis = { blocked: Map<ProposalKey, string>; dependents: Map<ProposalKey, ProposalKey[]>; keys: Map<string, ProposalKey> };
const groups = ['categories', 'people', 'projects', 'tasks', 'events', 'peopleSchedule'] as const;
export const proposalKey = (group: string, operation: string, id: string, index: number) => `${group}:${operation}:${id}:${index}`;
export function analyzeDependencies(update: ParsedUpdate, data: AppData, selected: Set<ProposalKey>): DependencyAnalysis {
  const keys = new Map<string, ProposalKey>(); const dependents = new Map<ProposalKey, ProposalKey[]>(); const blocked = new Map<ProposalKey, string>();
  const existing: Record<string, Set<string>> = { categories: new Set(data.categories.map(x => x.id)), people: new Set(data.people.map(x => x.id)), projects: new Set(data.projects.map(x => x.id)), tasks: new Set(data.tasks.map(x => x.id)), events: new Set(data.events.map(x => x.id)), peopleSchedule: new Set(data.personEvents.map(x => x.id)) };
  groups.forEach(group => ['add', 'update'].forEach(operation => ((update[group] as any)?.[operation] ?? []).forEach((r: any, i: number) => { const key = proposalKey(group, operation, String(r.id), i); keys.set(`${group}:${r.id}`, key); })));
  const refs = (group: string, r: any): [string, string][] => {
    if (group === 'events') return [['categories', r.category], ...((r.linkedTaskIds ?? []).map((id: string) => ['tasks', id] as [string, string]))].filter((x): x is [string,string] => !!x[1]);
    if (group === 'tasks') return [['categories', r.category], ['projects', r.projectId], ['tasks', r.parentTaskId], ...((r.linkedEventIds ?? []).map((id: string) => ['events', id] as [string,string]))].filter((x): x is [string,string] => !!x[1]);
    if (group === 'projects') return [];
    if (group === 'peopleSchedule') return [['people', r.person]].filter((x): x is [string,string] => !!x[1]);
    return [];
  };
  groups.forEach(group => ['add', 'update'].forEach(operation => ((update[group] as any)?.[operation] ?? []).forEach((r: any, i: number) => {
    const child = proposalKey(group, operation, String(r.id), i);
    refs(group, r).forEach(([parentGroup, id]) => { const parent = keys.get(`${parentGroup}:${id}`); if (parent) { const list = dependents.get(parent) ?? []; list.push(child); dependents.set(parent, list); if (!selected.has(parent)) blocked.set(child, `Blocked: ${parentGroup.slice(0, -1)} ${id} is not selected`); } else if (!existing[parentGroup].has(id)) blocked.set(child, `Blocked: ${parentGroup.slice(0, -1)} ${id} does not exist`); });
  })));
  // A simple cycle detector covers task/event same-patch links.
  const visiting = new Set<ProposalKey>(); const visited = new Set<ProposalKey>(); const visit = (key: ProposalKey) => { if (visiting.has(key)) { blocked.set(key, 'Blocked: circular dependency'); return; } if (visited.has(key)) return; visiting.add(key); (dependents.get(key) ?? []).forEach(visit); visiting.delete(key); visited.add(key); };
  [...keys.values()].forEach(visit); return { blocked, dependents, keys };
}
export const cascadeDeselection = (key: ProposalKey, selected: Set<ProposalKey>, analysis: DependencyAnalysis) => { const next = new Set(selected); const visit = (id: ProposalKey) => { next.delete(id); (analysis.dependents.get(id) ?? []).forEach(visit); }; visit(key); return next; };
