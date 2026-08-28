import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { generateUniversalCurrentPackage, generateUniversalStarterPrompt, parseAIUpdate, ParsedUpdate } from '../lib/aiPrompt';
import { downloadCurrentBackup } from '../lib/backup';
import { analyzeDependencies, cascadeDeselection } from '../lib/aiDependencies';
import { calculateDeleteImpacts, getPatchReadiness, patchProposalKey } from '../lib/aiPatchApply';
import { resolveProposalDisplayLabel } from '../lib/aiEntityQuality';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { APP_VERSION } from '../lib/version';
import { Check, Copy, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { copyText, downloadText } from '../lib/textDelivery';

type Workflow = 'current' | 'external';
type Preset = 'next7' | 'next30' | 'next90' | 'year' | 'all' | 'custom';
const iso = (date: Date) => date.toISOString().slice(0, 10);
const plus = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return iso(date); };

export const AIView = () => {
  const app = useAppData();
  const [workflow, setWorkflow] = useState<Workflow>('current');
  const [preset, setPreset] = useState<Preset>('all');
  const [start, setStart] = useState(iso(new Date()));
  const [end, setEnd] = useState(plus(30));
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [preview, setPreview] = useState<ParsedUpdate | null>(null);
  const [error, setError] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [deliveryPending, setDeliveryPending] = useState(false);
  // The sole selection state: every review surface uses canonical proposal keys.
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const initializedSession = useRef<string | null>(null);

  const selectPreset = (value: Preset) => {
    setPreset(value); setPrompt('');
    const now = new Date();
    if (value === 'next7') { setStart(iso(now)); setEnd(plus(7)); }
    if (value === 'next30') { setStart(iso(now)); setEnd(plus(30)); }
    if (value === 'next90') { setStart(iso(now)); setEnd(plus(90)); }
    if (value === 'year') { const y = now.getFullYear(); setStart(`${y}-01-01`); setEnd(`${y}-12-31`); }
  };
  const buildCurrentPackage = () => {
    if (workflow === 'current' && preset !== 'all' && (!start || !end || start > end)) throw new Error('invalid-range');
    return workflow === 'external'
    ? generateUniversalStarterPrompt()
    : generateUniversalCurrentPackage(app.activeCalendar.data, app.activeCalendar, preset === 'all' ? { start: null, end: null } : { start, end });
  };
  const generationFailure = (cause: unknown) => {
    const message = cause instanceof Error && cause.message === 'invalid-range' ? 'Choose a valid date range.' : 'LifeGrid AI package could not be generated.';
    setDeliveryStatus(message); toast.error(message);
  };
  const copy = async () => {
    if (deliveryPending) return;
    setDeliveryPending(true); setDeliveryStatus('');
    let value: string;
    try { value = buildCurrentPackage(); setPrompt(value); }
    catch (cause) { generationFailure(cause); setDeliveryPending(false); return; }
    try {
      if (await copyText(value)) { setDeliveryStatus('Complete AI package copied'); toast.success('Complete AI package copied'); }
      else { const message = 'Copy failed. The package is available under Preview package for manual copying.'; setDeliveryStatus(message); toast.error(message); }
    } catch { const message = 'Copy failed. The package is available under Preview package for manual copying.'; setDeliveryStatus(message); toast.error(message); }
    finally { setDeliveryPending(false); }
  };
  const download = () => {
    if (deliveryPending) return;
    setDeliveryPending(true); setDeliveryStatus('');
    let value: string;
    try { value = buildCurrentPackage(); setPrompt(value); }
    catch (cause) { generationFailure(cause); setDeliveryPending(false); return; }
    try {
      if (!downloadText(value, `lifegrid-ai-package-${iso(new Date())}.txt`)) throw new Error('delivery-failed');
      setDeliveryStatus('AI package download started'); toast.success('AI package download started');
    } catch { const message = 'AI package download failed. No file was downloaded.'; setDeliveryStatus(message); toast.error(message); }
    finally { setDeliveryPending(false); }
  };
  useEffect(() => { setPrompt(''); setDeliveryStatus(''); }, [workflow, preset, start, end, app.activeCalendar.id, app.activeCalendar.data]);
  const recordGroups = useMemo(() => preview ? toRecordGroups(preview, app.activeCalendar.data, selectedRecords) : [], [preview, app.activeCalendar.data, selectedRecords]);
  const dependencyAnalysis = useMemo(() => preview ? analyzeDependencies(preview, app, selectedRecords) : null, [preview, app.categories, app.people, app.projects, app.tasks, app.events, app.personEvents, selectedRecords]);
  // Proposal-local errors disable a row; selection conflicts remain live transaction findings.
  const blockedKeys = useMemo(() => { if(!preview) return new Set<string>(); const blocked=new Set<string>(); for(const proposal of recordGroups.flatMap(g=>g.records)){const plan=getPatchReadiness(app.activeCalendar.data,preview,new Set([proposal.key]));if(plan.findings.some(f=>f.severity==='blocking')) blocked.add(proposal.key);} return blocked; },[preview,recordGroups,app.activeCalendar.data]);
  const readiness = useMemo(() => preview ? getPatchReadiness(app.activeCalendar.data, preview, selectedRecords) : null, [preview, app.activeCalendar.data, selectedRecords]);
  const totalRecords = recordGroups.reduce((total, group) => total + group.records.length, 0);
  const patchSessionId = preview ? JSON.stringify(preview) : null;
  useEffect(() => {
    if (!preview || !patchSessionId || initializedSession.current === patchSessionId) return;
    const proposals = toRecordGroups(preview, app.activeCalendar.data).flatMap(group => group.records);
    const intrinsic = new Set(proposals.filter(proposal => getPatchReadiness(app.activeCalendar.data,preview,new Set([proposal.key])).findings.some(f=>f.severity==='blocking')).map(p=>p.key));
    setSelectedRecords(new Set(proposals.filter(proposal => proposal.operation !== 'Delete' && !intrinsic.has(proposal.key)).map(proposal => proposal.key)));
    initializedSession.current = patchSessionId;
  }, [preview, patchSessionId, app.activeCalendar.data]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as Window & { lifegridAiReviewState?: () => unknown }).lifegridAiReviewState = () => ({ appVersion: APP_VERSION, proposalCount: totalRecords, selectableCount: totalRecords - blockedKeys.size, visuallyCheckedCount: recordGroups.flatMap(g => g.records).filter(r => selectedRecords.has(r.key) && !blockedKeys.has(r.key)).length, selectedKeyCount: selectedRecords.size, selectedProposalCount: recordGroups.flatMap(g => g.records).filter(r => selectedRecords.has(r.key)).length, readinessSelectedCount: readiness?.selectedCount ?? 0, dependencyCount: dependencyAnalysis?.dependents.size ?? 0, blockingCount: readiness?.blockingCount ?? 0, warningCount: readiness?.warningCount ?? 0, canApply: readiness?.canApply ?? false });
    return () => { delete (window as Window & { lifegridAiReviewState?: () => unknown }).lifegridAiReviewState; };
  }, [blockedKeys, dependencyAnalysis, readiness, recordGroups, selectedRecords, totalRecords]);
  const review = () => { try { setError(''); const parsed = parseAIUpdate(response, app.categories, app); initializedSession.current = null; setPreview(parsed); } catch (e: any) { setPreview(null); setError(e.message); } };
  const apply = () => { if (!preview || !readiness?.canApply) { toast.error(readiness?.disabledReason ?? 'Resolve blocking errors before applying.'); return; } const deletes=recordGroups.flatMap(g=>g.records).filter(r=>r.operation==='Delete'&&selectedRecords.has(r.key)); const counts=deletes.reduce((map,record)=>(map.set(record.entityType,(map.get(record.entityType)??0)+1),map),new Map<string,number>()); const summary=[...counts].map(([group,n])=>`${n} ${group==='events'?'Event':group==='tasks'?'Task':group==='categories'?'Category':'Project'}${n===1?'':'s'}`).join('\n'); if(deletes.length&&!window.confirm(`Apply destructive AI changes?\n\nThe selected transaction will permanently delete:\n${summary}\n\nRelationship repairs shown in Preflight will also be applied.\n\nDelete and Apply ${readiness.selectedCount} Selected Changes`)) return; const selected = filterSelectedUpdate(preview, selectedRecords); try { const warnings = app.applyImportUpdate(selected); toast.success(`Applied ${readiness.selectedCount} selected changes`, { description: warnings.length ? warnings.join(' ') : undefined }); setPreview(null); setResponse(''); } catch (e: any) { toast.error('Transaction failed — no changes were applied.', { description: e.message }); } };
  const toggleRecord = (key: string) => setSelectedRecords(previous => { if (previous.has(key)) return dependencyAnalysis ? cascadeDeselection(key, previous, dependencyAnalysis) : previous; if (blockedKeys.has(key)) return previous; const next = new Set(previous); next.add(key); return next; });
  const toggleGroup = (records: PreviewRecord[]) => setSelectedRecords(previous => { const next = new Set(previous); const allSelected = records.every(record => next.has(record.key)); if (allSelected) return records.reduce((state, record) => dependencyAnalysis ? cascadeDeselection(record.key, state, dependencyAnalysis) : state, next); records.forEach(record => { if (!blockedKeys.has(record.key)) next.add(record.key); }); return next; });
  const count = (group?: { add: unknown[]; update: unknown[] }) => group ? `${group.add.length} new · ${group.update.length} updates` : 'none';

  return <div className="flex flex-col h-full bg-background overflow-y-auto">
    <header className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10"><h1 className="text-lg font-bold">AI Planner</h1><p className="text-xs text-muted-foreground">Model-agnostic, local-first, and always reviewed before changes apply.</p></header>
    <main className="p-4 pb-24 space-y-4 max-w-3xl w-full mx-auto">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <WorkflowCard selected={workflow === 'current'} onClick={() => { setWorkflow('current'); setPrompt(''); }} title="Export Current LifeGrid to AI" description="Create one complete package with selected scheduling context and import rules." />
        <WorkflowCard selected={workflow === 'external'} onClick={() => { setWorkflow('external'); setPrompt(''); }} title="Build a New LifeGrid from External Information" description="Create a private starter prompt; no current LifeGrid records are included." />
      </section>
      {workflow === 'current' && <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold text-sm">1. All data (default)</h2><p className="text-xs text-muted-foreground">Complete LifeGrid: every catalog, schedule, Event, milestone, and Task status. Download is recommended for large mobile exports.</p><details data-testid="ai-export-advanced"><summary className="cursor-pointer text-xs font-semibold">Advanced · restricted date range</summary><p className="my-2 text-xs text-muted-foreground" data-testid="ai-export-range-explanation">Full Category, Project, and People catalogs plus all undated Tasks are always included. Dated Events and schedules intersect the inclusive range; milestones and Task due dates must be in range. Restricted exports reduce file size but intentionally lose context outside the selected range.</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{([['next7','Next 7 Days'],['next30','Next 30 Days'],['next90','Next 90 Days'],['year','Current Year'],['all','All Data'],['custom','Custom Range']] as [Preset,string][]).map(([id,label]) => <button key={id} data-testid={`ai-export-preset-${id}`} onClick={() => selectPreset(id)} className={`rounded-lg border p-2 text-xs font-semibold ${preset === id ? 'border-primary bg-primary/10' : 'border-border'}`}>{label}</button>)}</div>{preset !== 'all' && <div className="mt-2 grid grid-cols-2 gap-2"><Input aria-label="Start date" type="date" value={start} onChange={e => { setPreset('custom'); setStart(e.target.value); }} /><Input aria-label="End date" type="date" value={end} onChange={e => { setPreset('custom'); setEnd(e.target.value); }} /></div>}</details></section>}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2"><h2 className="font-semibold text-sm">{workflow === 'current' ? '2' : '1'}. Send the package to any AI</h2><p className="text-xs text-muted-foreground">Tell the AI what to analyze or build. It must return LifeGrid JSON only when you request final changes.</p><div className="flex gap-2"><Button data-testid="button-ai-copy-package" disabled={deliveryPending} onClick={copy} className="flex-1 gap-2"><Copy size={15}/>Copy Complete AI Package</Button><Button data-testid="button-ai-download-package" disabled={deliveryPending} variant="outline" onClick={download} className="gap-2"><Download size={15}/>Download</Button></div>{deliveryStatus && <p data-testid="ai-package-delivery-status" role="status" className="text-xs text-muted-foreground">{deliveryStatus}</p>}{prompt && <details><summary className="text-xs text-primary cursor-pointer">Preview package</summary><pre data-testid="ai-package-preview" className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] bg-muted p-2 rounded">{prompt}</pre></details>}</section>
      <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold text-sm">{workflow === 'current' ? '3' : '2'}. Review returned JSON</h2><p className="text-xs text-muted-foreground">AI output is never applied automatically. Dependencies are checked again immediately before apply.</p><Button variant="outline" size="sm" onClick={() => { downloadCurrentBackup(app); toast.success('Current LifeGrid backup downloaded'); }}><Download size={14}/> Download Current LifeGrid Backup</Button><Textarea data-testid="ai-response-input" value={response} onChange={e => { setResponse(e.target.value); setPreview(null); setError(''); }} placeholder="Paste valid LifeGrid JSON returned by the external AI..." className="font-mono min-h-36 text-xs"/>{error && <p className="text-xs text-destructive whitespace-pre-wrap">{error}</p>}{!preview ? <Button disabled={!response.trim()} onClick={review} variant="secondary" className="gap-2"><Upload size={15}/>Review Preflight</Button> : <div className="border rounded-lg p-3 space-y-2 text-xs"><p className="font-semibold">Preflight — human approval required</p><p className="text-muted-foreground">{selectedRecords.size} selected of {totalRecords} proposed records. Deselecting a parent also deselects its dependent children; reselect them deliberately after restoring the parent.</p>{totalRecords >= 20 && <p className="rounded bg-amber-500/10 p-2 text-amber-800">This import contains {totalRecords} proposed records. Download a current JSON backup before applying.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded bg-muted/60 p-2 text-center"><span><b>{readiness?.selectedCount ?? 0}</b><br/>selected</span><span className="text-destructive"><b data-testid="blocking-count">{readiness?.blockingCount ?? 0}</b><br/>blocking errors</span><span className="text-amber-700"><b>{readiness?.warningCount ?? 0}</b><br/>warnings</span><span className="text-blue-700"><b>{readiness?.infoCount ?? 0}</b><br/>information</span></div><div className="flex flex-wrap gap-2"><Button data-testid="select-all-non-destructive" size="sm" variant="outline" onClick={() => setSelectedRecords(new Set(recordGroups.flatMap(g => g.records).filter(r=>r.operation!=='Delete'&&!blockedKeys.has(r.key)).map(r=>r.key)))}>Select all non-destructive</Button><Button data-testid="approve-all-deletions" size="sm" variant="destructive" onClick={() => setSelectedRecords(previous=>new Set([...previous,...recordGroups.flatMap(g=>g.records).filter(r=>r.operation==='Delete'&&!blockedKeys.has(r.key)).map(r=>r.key)]))}>Approve all deletions</Button><Button data-testid="deselect-all-deletions" size="sm" variant="outline" onClick={() => setSelectedRecords(previous=>new Set([...previous].filter(k=>!k.includes(':delete:'))))}>Deselect all deletions</Button><Button data-testid="deselect-all" size="sm" variant="outline" onClick={() => setSelectedRecords(new Set())}>Deselect all</Button></div>{(readiness?.findings.filter(f => f.severity === 'blocking').length ?? 0) > 0 && <details open><summary className="font-semibold text-destructive">Blocking errors</summary>{readiness?.findings.filter(f => f.severity === 'blocking').map((f,i) => <p key={i} className="text-destructive">{f.message}</p>)}</details>}<details open><summary className="font-semibold text-amber-700">Warnings</summary>{[...(preview.warnings??[]),...(readiness?.findings.filter(f=>f.severity==='warning').map(f=>f.message)??[])].map((w,i) => <p key={i} className="text-amber-700">Warning: {w}</p>)}</details><div className="space-y-3">{recordGroups.filter(g=>g.records.some(r=>r.operation!=='Delete')).map(group => <RecordGroup key={group.title} group={{...group,records:group.records.filter(r=>r.operation!=='Delete')}} selected={selectedRecords} blocked={blockedKeys} toggleRecord={toggleRecord} toggleGroup={toggleGroup}/>)}</div>{recordGroups.some(g=>g.records.some(r=>r.operation==='Delete'))&&<section data-testid="destructive-deletions" className="rounded-lg border-2 border-destructive bg-destructive/5 p-3 space-y-2"><h3 className="font-bold text-destructive">Destructive changes — Deletions</h3><p>Deletion proposals are not selected by default. Review individually or approve the complete deletion section.</p>{recordGroups.filter(g=>g.records.some(r=>r.operation==='Delete')).map(group=><RecordGroup key={group.title} group={{...group,records:group.records.filter(r=>r.operation==='Delete')}} selected={selectedRecords} blocked={blockedKeys} toggleRecord={toggleRecord} toggleGroup={toggleGroup}/>)}</section>}{[...selectedRecords].some(k=>k.includes(':delete:'))&&<p className="text-destructive">Consider downloading a current backup before applying destructive changes.</p>}{!readiness?.canApply && <p className="text-destructive font-medium">{readiness?.disabledReason}</p>}<Button data-testid="apply-selected" disabled={!readiness?.canApply} onClick={apply} className="gap-2"><Check size={15}/>Approve and Apply {readiness?.selectedCount ?? 0} Selected</Button></div>}</section>
      <p className="text-center text-[11px] text-muted-foreground">LifeGrid {APP_VERSION} · Universal AI Interchange v5</p>
    </main>
  </div>;
};
function WorkflowCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) { return <button onClick={onClick} className={`text-left rounded-xl border p-4 ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card'}`}><h2 className="font-semibold text-sm">{title}</h2><p className="text-xs text-muted-foreground mt-1">{description}</p></button>; }


type PreviewRecord = { key: string; group: string; entityType: 'categories'|'people'|'projects'|'tasks'|'events'|'peopleSchedule'; operation: 'New' | 'Update' | 'Delete'; label: string; id: string; detail?: string };
const toRecordGroups = (update: ParsedUpdate, current: any, selected?: Set<string>): { title: string; records: PreviewRecord[] }[] => {
  const groups: { title: string; records: PreviewRecord[] }[] = [];
  const add = (title: string, entityType: 'categories'|'people'|'projects'|'tasks'|'events'|'peopleSchedule', source: any, detail: (record: any) => string | undefined = () => undefined) => {
    const impacts=new Map(calculateDeleteImpacts(current,update,selected).map(i=>[i.proposalKey,i])); const records = ['add', 'update','delete'].flatMap(operation => (source?.[operation] ?? []).map((value: any) => { const id=String(operation==='delete'?value:value.id); const record=operation==='delete' ? current[{categories:'categories',people:'people',projects:'projects',tasks:'tasks',events:'events',peopleSchedule:'personEvents'}[entityType]].find((r:any)=>r.id===id) : value; return { key: patchProposalKey(entityType, operation as any, id), group: title, entityType, operation: operation === 'add' ? 'New' as const : operation==='update'?'Update' as const:'Delete' as const, label: operation==='delete' ? (record?.name??record?.title??record?.label??id) : resolveProposalDisplayLabel(entityType, operation as any, record, current), id, detail: operation==='delete'?impacts.get(patchProposalKey(entityType,'delete',id))?.behavior:detail(record) }; }));
    if (records.length) groups.push({ title, records });
  };
  add('Categories / Tags', 'categories', update.categories);
  add('People', 'people', update.people);
  add('Projects / Project Tags', 'projects', update.projects);
  add('Tasks', 'tasks', update.tasks, r => [r.dueDate, r.projectId && `Project: ${r.projectId}`].filter(Boolean).join(' · ') || undefined);
  add('Events / Grid Items', 'events', update.events, r => [r.date, r.category && `Category: ${r.category}`].filter(Boolean).join(' · ') || undefined);
  add('Schedule or Availability', 'peopleSchedule', update.peopleSchedule, r => [r.date, r.person && `Person: ${r.person}`].filter(Boolean).join(' · ') || undefined);
  return groups;
};
const filterSelectedUpdate = (update: ParsedUpdate, selected: Set<string>): ParsedUpdate => {
  const allowed = selected;
  const clone: ParsedUpdate = JSON.parse(JSON.stringify(update));
  const sources: Array<keyof Pick<ParsedUpdate, 'categories'|'people'|'projects'|'tasks'|'events'|'peopleSchedule'>> = ['categories', 'people', 'projects', 'tasks', 'events', 'peopleSchedule'];
  sources.forEach(sourceKey => { const source: any = clone[sourceKey]; if (!source) return; ['add','update'].forEach(operation => { source[operation] = (source[operation] ?? []).filter((record: any) => allowed.has(patchProposalKey(sourceKey, operation as any, String(record.id)))); }); source.delete=(source.delete??[]).filter((id:string)=>allowed.has(patchProposalKey(sourceKey,'delete',id))); });
  return clone;
};
const RecordGroup=({group,selected,blocked,toggleRecord,toggleGroup}:{group:{title:string;records:PreviewRecord[]};selected:Set<string>;blocked:Set<string>;toggleRecord:(key:string)=>void;toggleGroup:(records:PreviewRecord[])=>void})=><section className="rounded border border-border p-2"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={group.records.every(r=>selected.has(r.key))} onChange={()=>toggleGroup(group.records)}/>{group.title} ({group.records.filter(r=>selected.has(r.key)).length}/{group.records.length})</label><div className="mt-1 space-y-1">{group.records.map(r=><label key={r.key} data-testid={`proposal-${r.key}`} data-proposal-key={r.key} className="flex gap-2 rounded bg-muted/50 p-1.5"><input type="checkbox" checked={selected.has(r.key)} disabled={blocked.has(r.key)} onChange={()=>toggleRecord(r.key)}/><span><b>{r.operation}</b> · “{r.label}” <span className="text-muted-foreground">{r.id}</span>{r.detail&&<span className="block text-muted-foreground">{r.detail}</span>}{blocked.has(r.key)&&<span className="block text-destructive">Blocked proposal</span>}</span></label>)}</div></section>;
