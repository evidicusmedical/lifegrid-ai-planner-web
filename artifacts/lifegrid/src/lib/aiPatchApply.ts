import type { AppData } from '../types';
import { patchProposalKey, type PatchEntityType, type PatchOperation } from './aiDependencies.js';
import { identityField, validateAddedEntityIdentity } from './aiEntityQuality.js';
export { patchProposalKey, type PatchEntityType, type PatchOperation } from './aiDependencies.js';

export type ValidationSeverity = 'blocking' | 'warning' | 'info';
export type ValidationFinding = { code: string; severity: ValidationSeverity; section?: 'categories'|'people'|'projects'|'tasks'|'events'|'peopleSchedule'|'patch'; operation?: 'add'|'update'; recordId?: string; fieldPath?: string; correction?: string; message: string; dependencyRecordIds?: string[] };
export type PatchReadiness = { selectedCount: number; blockingCount: number; warningCount: number; infoCount: number; canApply: boolean; disabledReason: string | null };
const groups = ['categories', 'people', 'projects', 'tasks', 'events', 'peopleSchedule'] as const;
const collection: Record<string, keyof AppData> = { categories: 'categories', people: 'people', projects: 'projects', tasks: 'tasks', events: 'events', peopleSchedule: 'personEvents' };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const key = (group: string, operation: string, id: string) => patchProposalKey(group as PatchEntityType, operation as PatchOperation, id);
const has = (value: object, field: string) => Object.prototype.hasOwnProperty.call(value, field);

/** Builds a complete, immutable post-patch plan. Updates are field-presence patches, never replacements. */
export function preflightPatch(current: AppData, patch: any, selected?: Set<string>) {
  const findings: ValidationFinding[] = [];
  const selectedKeys = selected ?? new Set<string>();
  const all = groups.flatMap(group => ['add','update'].flatMap(operation => (patch?.[group]?.[operation] ?? []).map((record: any, index: number) => ({ group, operation: operation as 'add'|'update', record, index, key: key(group, operation, String(record?.id ?? '')) }))));
  const active = selected ? all.filter(x => selectedKeys.has(x.key)) : all;
  const addIds: Record<string, Set<string>> = Object.fromEntries(groups.map(g => [g, new Set<string>()]));
  const seen = new Map<string, string>();
  active.forEach(item => {
    const id = typeof item.record?.id === 'string' ? item.record.id : '';
    if (!id) findings.push({ code:'required-id', severity:'blocking', section:item.group, operation:item.operation, message:`${item.group} ${item.operation} requires an id.` });
    const identity = `${item.group}:${id}`;
    if (id && seen.has(identity)) findings.push({ code:'duplicate-operation', severity:'blocking', section:item.group, operation:item.operation, recordId:id, message:`Conflicting operations target ${item.group} ${id}.` });
    else if (id) seen.set(identity, item.key);
    if (item.operation === 'add' && id) addIds[item.group].add(id);
    if (item.operation === 'add') {
      const issue = validateAddedEntityIdentity(item.group, item.record);
      if (issue) findings.push({ code:issue.code, severity:issue.severity, section:item.group, operation:'add', recordId:id, fieldPath:`${item.group}.add[${item.index}].${issue.field}`, correction:issue.correction, message:issue.explanation });
      const existing = (current as any)[collection[item.group]]?.find((record: any) => record.id === id);
      if (existing) findings.push({ code:'ADDITION_ID_ALREADY_EXISTS', severity:'blocking', section:item.group, operation:'add', recordId:id, fieldPath:`${item.group}.add[${item.index}].id`, correction:'Use update with this exact existing ID, or choose a new ID.', message:`${item.group} add reuses an existing ID.` });
    }
    if (item.operation === 'update' && Object.keys(item.record ?? {}).filter(field => field !== 'id').length === 0) findings.push({ code:'UPDATE_MISSING_CHANGED_FIELDS', severity:'blocking', section:item.group, operation:'update', recordId:id, fieldPath:`${item.group}.update[${item.index}]`, correction:'Include at least one changed field besides id.', message:`${item.group} update contains no changed fields.` });
  });
  const next = clone(current) as any;
  // Establish all additions first so same-patch references resolve regardless of ordering.
  for (const group of groups) {
    const records: any[] = next[collection[group]] ?? [];
    for (const item of active.filter(x => x.group === group && x.operation === 'add')) {
      const r = item.record; if (!r?.id || records.some(x => x.id === r.id)) { if (r?.id) findings.push({ code:'ADDITION_ID_ALREADY_EXISTS', severity:'blocking', section:group, operation:'add', recordId:r.id, message:`${group} id ${r.id} already exists.` }); continue; }
      records.push(clone(r));
    }
    next[collection[group]] = records;
  }
  for (const group of groups) for (const item of active.filter(x => x.group === group && x.operation === 'update')) {
    const r = item.record; const records: any[] = next[collection[group]] ?? []; const index = records.findIndex(x => x.id === r?.id);
    if (index < 0) { findings.push({ code:'UPDATE_TARGET_NOT_FOUND', severity:'blocking', section:group, operation:'update', recordId:r?.id, message:`Cannot update missing ${group} id: ${r?.id ?? 'missing'}.` }); continue; }
    if (group === 'categories' && r.id === 'other') { findings.push({ code:'protected-identity', severity:'blocking', section:group, operation:'update', recordId:r.id, message:'The protected Other category cannot be updated by an AI patch.' }); continue; }
    const merged = { ...records[index] };
    Object.keys(r).forEach(field => { if (field !== 'id' && has(r, field)) merged[field] = clone(r[field]); });
    records[index] = merged;
    findings.push({ code:'merged-update', severity:'info', section:group, operation:'update', recordId:r.id, message:`Update ${r.id} was merged with the current record.` });
  }
  try { validateReferences(next); validateRecords(next); } catch (error: any) { findings.push({ code:'integrity', severity:'blocking', section:'patch', message:error.message }); }
  // A dependency missing from selected additions is a selected transaction error, not a global warning.
  const persisted: Record<string, Set<string>> = { categories:new Set(current.categories.map(x=>x.id)), people:new Set(current.people.map(x=>x.id)), projects:new Set(current.projects.map(x=>x.id)), tasks:new Set(current.tasks.map(x=>x.id)), events:new Set(current.events.map(x=>x.id)), peopleSchedule:new Set(current.personEvents.map(x=>x.id)) };
  active.forEach(item => references(item.group, item.record).forEach(([target, id]) => { if (!persisted[target].has(id) && !addIds[target].has(id)) findings.push({ code:'unselected-dependency', severity:'blocking', section:item.group, operation:item.operation, recordId:item.record.id, dependencyRecordIds:[id], message:`Selected ${item.group} ${item.record.id} references ${target} ${id}, which does not exist in the selected transaction.` }); }));
  const noopKeys = new Set<string>();
  active.filter(x=>x.operation==='update').forEach(item => { const original = (current as any)[collection[item.group]]?.find((x:any)=>x.id===item.record.id); const final = (next as any)[collection[item.group]]?.find((x:any)=>x.id===item.record.id); if (original && final && JSON.stringify(original) === JSON.stringify(final)) { noopKeys.add(item.key); findings.push({code:'no-op-update',severity:'info',section:item.group,operation:'update',recordId:item.record.id,message:`Update ${item.record.id} makes no change.`}); } });
  return { data: next as AppData, findings, noopKeys, activeKeys: active.map(x=>x.key) };
}
export function getPatchReadiness(current: AppData, patch: any, selected: Set<string>): PatchReadiness & { findings: ValidationFinding[] } {
  const plan = preflightPatch(current, patch, selected); const blockingCount = plan.findings.filter(x=>x.severity==='blocking').length; const warningCount = plan.findings.filter(x=>x.severity==='warning').length + (patch?.warnings?.length ?? 0); const infoCount = plan.findings.filter(x=>x.severity==='info').length; const selectedCount = plan.activeKeys.length;
  const disabledReason = !selectedCount ? 'Select at least one change.' : blockingCount ? `${blockingCount} selected change${blockingCount===1?' contains':'s contain'} blocking errors.` : null;
  return { selectedCount, blockingCount, warningCount, infoCount, canApply:selectedCount>0 && blockingCount===0, disabledReason, findings:plan.findings };
}
/** Applies only a fully preflighted patch to an isolated clone. Callers persist the returned data once. */
export function applyPatchAtomically(currentData: AppData, patch: any) {
  const plan = preflightPatch(currentData, patch);
  const blocking = plan.findings.filter(x => x.severity === 'blocking');
  if (blocking.length) throw new Error(blocking.map(x=>x.message).join('; '));
  const appliedKeys = plan.activeKeys.filter(x=>!plan.noopKeys.has(x));
  return { data: plan.data, warnings: [] as string[], appliedKeys, skippedKeys: [...plan.noopKeys] };
}
function references(group: string, r: any): [string,string][] { if (group==='events') return [['categories',r.category], ...((r.linkedTaskIds??[]).map((id:string)=>['tasks',id] as [string,string]))].filter(x=>!!x[1]); if(group==='tasks') return [['categories',r.category],['projects',r.projectId],['tasks',r.parentTaskId],...((r.linkedEventIds??[]).map((id:string)=>['events',id] as [string,string]))].filter(x=>!!x[1]); if(group==='peopleSchedule') return ([['people',r.person]] as [string,string][]).filter(x=>!!x[1]); return []; }
function validateRecords(data: AppData) {
  const date = (value: unknown) => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const time = (value: unknown) => value === null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
  data.tasks.forEach(t => { if (!t.name || !['todo','in-progress','done','blocked'].includes(t.status) || !['low','medium','high','urgent'].includes(t.priority) || !date(t.dueDate)) throw new Error(`Task ${t.id} has invalid required fields after merge.`); });
  data.events.forEach(e => { if (!e.title || !date(e.date) || !date(e.endDate) || !time(e.startTime) || !time(e.endTime) || !['all-day','timed','unknown','approximate'].includes(e.timeStatus)) throw new Error(`Event ${e.id} has invalid required fields after merge.`); });
  data.projects.forEach(p => { if (!p.name || !['active','paused','completed','archived'].includes(p.status)) throw new Error(`Project ${p.id} has invalid required fields after merge.`); });
}
export function validateReferences(data: AppData) { const cats=new Set(data.categories.map(x=>x.id)), people=new Set(data.people.map(x=>x.id)), projects=new Set(data.projects.map(x=>x.id)), tasks=new Set(data.tasks.map(x=>x.id)), events=new Set(data.events.map(x=>x.id)); if(!cats.has('other')) throw new Error('The required Other category is missing.'); data.events.forEach(e=>{if(!cats.has(e.category))throw new Error(`Event ${e.id} references a category that does not exist.`);(e.linkedTaskIds??[]).forEach(id=>{if(!tasks.has(id))throw new Error(`Event ${e.id} references a linked task that does not exist.`);});}); data.tasks.forEach(t=>{if(!cats.has(t.category))throw new Error(`Task ${t.id} references a category that does not exist.`);if(t.projectId&&!projects.has(t.projectId))throw new Error(`Task ${t.id} references a project that does not exist.`);if(t.parentTaskId&&!tasks.has(t.parentTaskId))throw new Error(`Task ${t.id} references a parent task that does not exist.`);(t.linkedEventIds??[]).forEach(id=>{if(!events.has(id))throw new Error(`Task ${t.id} references a linked event that does not exist.`);});}); data.personEvents.forEach(p=>{if(!people.has(p.person))throw new Error(`People Schedule ${p.id} references a person that does not exist.`);}); const visit=(id:string,path=new Set<string>()):void=>{if(path.has(id))throw new Error('Task parent relationship contains a cycle.');const task=data.tasks.find(t=>t.id===id);if(task?.parentTaskId){const n=new Set(path);n.add(id);visit(task.parentTaskId,n);}};data.tasks.forEach(t=>visit(t.id)); }
