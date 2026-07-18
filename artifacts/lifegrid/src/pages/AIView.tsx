import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { generateUniversalCurrentPackage, generateUniversalStarterPrompt, parseAIUpdate, ParsedUpdate } from '../lib/aiPrompt';
import { downloadCurrentBackup } from '../lib/backup';
import { analyzeDependencies, cascadeDeselection } from '../lib/aiDependencies';
import { getPatchReadiness, patchProposalKey } from '../lib/aiPatchApply';
import { resolveProposalDisplayLabel } from '../lib/aiEntityQuality';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { APP_VERSION } from '../lib/version';
import { Check, Copy, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

type Workflow = 'current' | 'external';
type Preset = 'next7' | 'next30' | 'next90' | 'year' | 'all' | 'custom';
const iso = (date: Date) => date.toISOString().slice(0, 10);
const plus = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return iso(date); };

export const AIView = () => {
  const app = useAppData();
  const [workflow, setWorkflow] = useState<Workflow>('current');
  const [preset, setPreset] = useState<Preset>('next30');
  const [start, setStart] = useState(iso(new Date()));
  const [end, setEnd] = useState(plus(30));
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [preview, setPreview] = useState<ParsedUpdate | null>(null);
  const [error, setError] = useState('');
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
  const build = () => workflow === 'external'
    ? generateUniversalStarterPrompt()
    : generateUniversalCurrentPackage(app, app.activeCalendar, preset === 'all' ? { start: null, end: null } : { start, end });
  const copy = async () => { if (preset !== 'all' && workflow === 'current' && (!start || !end || start > end)) { toast.error('Choose a valid date range.'); return; } const value = build(); setPrompt(value); await navigator.clipboard.writeText(value); toast.success('Complete AI package copied'); };
  const download = () => { const value = prompt || build(); setPrompt(value); const url = URL.createObjectURL(new Blob([value], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = `lifegrid-ai-package-${iso(new Date())}.txt`; a.click(); URL.revokeObjectURL(url); };
  const recordGroups = useMemo(() => preview ? toRecordGroups(preview, app.activeCalendar.data) : [], [preview, app.activeCalendar.data]);
  const dependencyAnalysis = useMemo(() => preview ? analyzeDependencies(preview, app, selectedRecords) : null, [preview, app.categories, app.people, app.projects, app.tasks, app.events, app.personEvents, selectedRecords]);
  const blockedKeys = dependencyAnalysis ? new Set([...dependencyAnalysis.blocked].filter(([key]) => selectedRecords.has(key)).map(([key]) => key)) : new Set<string>();
  const readiness = useMemo(() => preview ? getPatchReadiness(app.activeCalendar.data, preview, selectedRecords) : null, [preview, app.activeCalendar.data, selectedRecords]);
  const totalRecords = recordGroups.reduce((total, group) => total + group.records.length, 0);
  const patchSessionId = preview ? JSON.stringify(preview) : null;
  useEffect(() => {
    if (!preview || !patchSessionId || initializedSession.current === patchSessionId) return;
    const proposals = toRecordGroups(preview, app.activeCalendar.data).flatMap(group => group.records);
    const candidateKeys = new Set(proposals.map(proposal => proposal.key));
    const initialReadiness = getPatchReadiness(app.activeCalendar.data, preview, candidateKeys);
    const blockingKeys = new Set(initialReadiness.findings.filter(f => f.severity === 'blocking' && f.section && f.operation && f.recordId).map(f => patchProposalKey(f.section! as Exclude<NonNullable<typeof f.section>, 'patch'>, f.operation!, f.recordId!)));
    setSelectedRecords(new Set(proposals.filter(proposal => !blockingKeys.has(proposal.key)).map(proposal => proposal.key)));
    initializedSession.current = patchSessionId;
  }, [preview, patchSessionId, app.activeCalendar.data]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as Window & { lifegridAiReviewState?: () => unknown }).lifegridAiReviewState = () => ({ appVersion: APP_VERSION, proposalCount: totalRecords, selectableCount: totalRecords - blockedKeys.size, visuallyCheckedCount: recordGroups.flatMap(g => g.records).filter(r => selectedRecords.has(r.key) && !blockedKeys.has(r.key)).length, selectedKeyCount: selectedRecords.size, selectedProposalCount: recordGroups.flatMap(g => g.records).filter(r => selectedRecords.has(r.key)).length, readinessSelectedCount: readiness?.selectedCount ?? 0, dependencyCount: dependencyAnalysis?.dependents.size ?? 0, blockingCount: readiness?.blockingCount ?? 0, warningCount: readiness?.warningCount ?? 0, canApply: readiness?.canApply ?? false });
    return () => { delete (window as Window & { lifegridAiReviewState?: () => unknown }).lifegridAiReviewState; };
  }, [blockedKeys, dependencyAnalysis, readiness, recordGroups, selectedRecords, totalRecords]);
  const review = () => { try { setError(''); const parsed = parseAIUpdate(response, app.categories, app); initializedSession.current = null; setPreview(parsed); } catch (e: any) { setPreview(null); setError(e.message); } };
  const apply = () => { if (!preview || !readiness?.canApply) { toast.error(readiness?.disabledReason ?? 'Resolve blocking errors before applying.'); return; } const selected = filterSelectedUpdate(preview, selectedRecords); try { const warnings = app.applyImportUpdate(selected); toast.success(`Applied ${readiness.selectedCount} selected changes`, { description: warnings.length ? warnings.join(' ') : undefined }); setPreview(null); setResponse(''); } catch (e: any) { toast.error('Transaction failed — no changes were applied.', { description: e.message }); } };
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
      {workflow === 'current' && <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold text-sm">1. Select date range</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{([['next7','Next 7 Days'],['next30','Next 30 Days'],['next90','Next 90 Days'],['year','Current Year'],['all','All Data'],['custom','Custom Range']] as [Preset,string][]).map(([id,label]) => <button key={id} onClick={() => selectPreset(id)} className={`rounded-lg border p-2 text-xs font-semibold ${preset === id ? 'border-primary bg-primary/10' : 'border-border'}`}>{label}</button>)}</div>{preset !== 'all' && <div className="grid grid-cols-2 gap-2"><Input aria-label="Start date" type="date" value={start} onChange={e => { setPreset('custom'); setStart(e.target.value); }} /><Input aria-label="End date" type="date" value={end} onChange={e => { setPreset('custom'); setEnd(e.target.value); }} /></div>}</section>}
      <section className="rounded-xl border border-border bg-card p-4 space-y-2"><h2 className="font-semibold text-sm">{workflow === 'current' ? '2' : '1'}. Send the package to any AI</h2><p className="text-xs text-muted-foreground">Tell the AI what to analyze or build. It must return LifeGrid JSON only when you request final changes.</p><div className="flex gap-2"><Button onClick={copy} className="flex-1 gap-2"><Copy size={15}/>Copy Complete AI Package</Button><Button variant="outline" onClick={download} className="gap-2"><Download size={15}/>Download</Button></div>{prompt && <details><summary className="text-xs text-primary cursor-pointer">Preview package</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] bg-muted p-2 rounded">{prompt}</pre></details>}</section>
      <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold text-sm">{workflow === 'current' ? '3' : '2'}. Review returned JSON</h2><p className="text-xs text-muted-foreground">AI output is never applied automatically. Dependencies are checked again immediately before apply.</p><Button variant="outline" size="sm" onClick={() => { downloadCurrentBackup(app); toast.success('Current LifeGrid backup downloaded'); }}><Download size={14}/> Download Current LifeGrid Backup</Button><Textarea value={response} onChange={e => { setResponse(e.target.value); setPreview(null); setError(''); }} placeholder="Paste valid LifeGrid JSON returned by the external AI..." className="font-mono min-h-36 text-xs"/>{error && <p className="text-xs text-destructive whitespace-pre-wrap">{error}</p>}{!preview ? <Button disabled={!response.trim()} onClick={review} variant="secondary" className="gap-2"><Upload size={15}/>Review Preflight</Button> : <div className="border rounded-lg p-3 space-y-2 text-xs"><p className="font-semibold">Preflight — human approval required</p><p className="text-muted-foreground">{selectedRecords.size} selected of {totalRecords} proposed records. Deselecting a parent also deselects its dependent children; reselect them deliberately after restoring the parent.</p>{totalRecords >= 20 && <p className="rounded bg-amber-500/10 p-2 text-amber-800">This import contains {totalRecords} proposed records. Download a current JSON backup before applying.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded bg-muted/60 p-2 text-center"><span><b>{readiness?.selectedCount ?? 0}</b><br/>selected</span><span className="text-destructive"><b>{readiness?.blockingCount ?? 0}</b><br/>blocking errors</span><span className="text-amber-700"><b>{readiness?.warningCount ?? 0}</b><br/>warnings</span><span className="text-blue-700"><b>{readiness?.infoCount ?? 0}</b><br/>information</span></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedRecords(new Set(recordGroups.flatMap(g => g.records.map(r => r.key)).filter(k => !blockedKeys.has(k))))}>Select all valid</Button><Button size="sm" variant="outline" onClick={() => setSelectedRecords(new Set())}>Deselect all</Button><Button size="sm" variant="outline" onClick={() => setSelectedRecords(previous => new Set([...previous].filter(k => !blockedKeys.has(k))))}>Deselect blocking</Button></div>{(readiness?.findings.filter(f => f.severity === 'blocking').length ?? 0) > 0 && <details open><summary className="font-semibold text-destructive">Blocking errors</summary>{readiness?.findings.filter(f => f.severity === 'blocking').map((f,i) => <p key={i} className="text-destructive">{f.message}</p>)}</details>}<details><summary className="font-semibold text-amber-700">Warnings</summary>{preview.warnings?.map(w => <p key={w} className="text-amber-700">Warning: {w}</p>)}</details><details><summary className="font-semibold text-blue-700">Information</summary>{readiness?.findings.filter(f => f.severity === 'info').map((f,i) => <p key={i} className="text-blue-700">{f.message}</p>)}</details><div className="space-y-3">{recordGroups.map(group => <section key={group.title} className="rounded border border-border p-2"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={group.records.every(record => selectedRecords.has(record.key))} onChange={() => toggleGroup(group.records)} />{group.title} ({group.records.filter(record => selectedRecords.has(record.key)).length}/{group.records.length})</label><div className="mt-1 space-y-1">{group.records.map(record => <label key={record.key} className="flex gap-2 rounded bg-muted/50 p-1.5"><input type="checkbox" checked={selectedRecords.has(record.key)} disabled={blockedKeys.has(record.key)} onChange={() => toggleRecord(record.key)} /><span><b>{record.operation}</b> · {record.label} <span className="text-muted-foreground">({record.id})</span>{record.detail && <span className="block text-muted-foreground">{record.detail}</span>}{dependencyAnalysis?.blocked.get(record.key) && <span className="block text-destructive">{dependencyAnalysis.blocked.get(record.key)}</span>}</span></label>)}</div></section>)}</div>{!readiness?.canApply && <p className="text-destructive font-medium">{readiness?.disabledReason}</p>}<Button disabled={!readiness?.canApply} onClick={apply} className="gap-2"><Check size={15}/>Approve and Apply {readiness?.selectedCount ?? 0} Selected</Button></div>}</section>
      <p className="text-center text-[11px] text-muted-foreground">LifeGrid {APP_VERSION} · Universal AI Interchange v4</p>
    </main>
  </div>;
};
function WorkflowCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) { return <button onClick={onClick} className={`text-left rounded-xl border p-4 ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card'}`}><h2 className="font-semibold text-sm">{title}</h2><p className="text-xs text-muted-foreground mt-1">{description}</p></button>; }


type PreviewRecord = { key: string; group: string; operation: 'New' | 'Update'; label: string; id: string; detail?: string };
const toRecordGroups = (update: ParsedUpdate, current: any): { title: string; records: PreviewRecord[] }[] => {
  const groups: { title: string; records: PreviewRecord[] }[] = [];
  const add = (title: string, entityType: 'categories'|'people'|'projects'|'tasks'|'events'|'peopleSchedule', source: any, detail: (record: any) => string | undefined = () => undefined) => {
    const records = ['add', 'update'].flatMap(operation => (source?.[operation] ?? []).map((record: any) => ({ key: patchProposalKey(entityType, operation as 'add' | 'update', String(record.id)), group: title, operation: operation === 'add' ? 'New' as const : 'Update' as const, label: resolveProposalDisplayLabel(entityType, operation as 'add'|'update', record, current), id: String(record.id), detail: detail(record) })));
    if (records.length) groups.push({ title, records });
  };
  add('Categories', 'categories', update.categories);
  add('People', 'people', update.people);
  add('Projects', 'projects', update.projects);
  add('Tasks', 'tasks', update.tasks, r => [r.dueDate, r.projectId && `Project: ${r.projectId}`].filter(Boolean).join(' · ') || undefined);
  add('Events', 'events', update.events, r => [r.date, r.category && `Category: ${r.category}`].filter(Boolean).join(' · ') || undefined);
  add('Schedule or Availability', 'peopleSchedule', update.peopleSchedule, r => [r.date, r.person && `Person: ${r.person}`].filter(Boolean).join(' · ') || undefined);
  return groups;
};
const filterSelectedUpdate = (update: ParsedUpdate, selected: Set<string>): ParsedUpdate => {
  const allowed = selected;
  const clone: ParsedUpdate = JSON.parse(JSON.stringify(update));
  const sources: Array<keyof Pick<ParsedUpdate, 'categories'|'people'|'projects'|'tasks'|'events'|'peopleSchedule'>> = ['categories', 'people', 'projects', 'tasks', 'events', 'peopleSchedule'];
  sources.forEach(sourceKey => { const source: any = clone[sourceKey]; if (!source) return; ['add','update'].forEach(operation => { source[operation] = (source[operation] ?? []).filter((record: any) => allowed.has(patchProposalKey(sourceKey, operation as 'add' | 'update', String(record.id)))); }); });
  return clone;
};
