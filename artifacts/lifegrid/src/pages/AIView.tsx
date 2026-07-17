import React, { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { generateUniversalCurrentPackage, generateUniversalStarterPrompt, parseAIUpdate, ParsedUpdate } from '../lib/aiPrompt';
import { downloadCurrentBackup } from '../lib/backup';
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
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

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
  const recordGroups = useMemo(() => preview ? toRecordGroups(preview) : [], [preview]);
  const review = () => { try { setError(''); const parsed = parseAIUpdate(response, app.categories, app); setPreview(parsed); setSelectedRecords(new Set(toRecordGroups(parsed).flatMap(group => group.records.map(record => record.key)))); } catch (e: any) { setPreview(null); setError(e.message); } };
  const apply = () => { if (!preview) return; const selected = filterSelectedUpdate(preview, selectedRecords); app.applyImportUpdate(selected); toast.success('Approved changes applied'); setPreview(null); setResponse(''); };
  const toggleRecord = (key: string) => setSelectedRecords(previous => { const next = new Set(previous); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const toggleGroup = (records: PreviewRecord[]) => setSelectedRecords(previous => { const next = new Set(previous); const allSelected = records.every(record => next.has(record.key)); records.forEach(record => allSelected ? next.delete(record.key) : next.add(record.key)); return next; });
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
      <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold text-sm">{workflow === 'current' ? '3' : '2'}. Review returned JSON</h2><p className="text-xs text-muted-foreground">AI output is never applied automatically. Download a backup before substantial changes.</p><Button variant="outline" size="sm" onClick={() => { downloadCurrentBackup(app); toast.success('Current LifeGrid backup downloaded'); }}><Download size={14}/> Download Current LifeGrid Backup</Button><Textarea value={response} onChange={e => { setResponse(e.target.value); setPreview(null); setError(''); }} placeholder="Paste valid LifeGrid JSON returned by the external AI..." className="font-mono min-h-36 text-xs"/>{error && <p className="text-xs text-destructive whitespace-pre-wrap">{error}</p>}{!preview ? <Button disabled={!response.trim()} onClick={review} variant="secondary" className="gap-2"><Upload size={15}/>Review Preflight</Button> : <div className="border rounded-lg p-3 space-y-2 text-xs"><p className="font-semibold">Preflight — human approval required</p><p className="text-muted-foreground">{selectedRecords.size} selected of {recordGroups.reduce((total, group) => total + group.records.length, 0)} proposed records. Deselecting a record excludes it from this apply action.</p>
          <div className="space-y-3">{recordGroups.map(group => <section key={group.title} className="rounded border border-border p-2"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={group.records.every(record => selectedRecords.has(record.key))} onChange={() => toggleGroup(group.records)} />{group.title} ({group.records.filter(record => selectedRecords.has(record.key)).length}/{group.records.length})</label><div className="mt-1 space-y-1">{group.records.map(record => <label key={record.key} className="flex gap-2 rounded bg-muted/50 p-1.5"><input type="checkbox" checked={selectedRecords.has(record.key)} onChange={() => toggleRecord(record.key)} /><span><b>{record.operation}</b> · {record.label} <span className="text-muted-foreground">({record.id})</span>{record.detail && <span className="block text-muted-foreground">{record.detail}</span>}</span></label>)}</div></section>)}</div>{preview.warnings?.map(w => <p key={w} className="text-amber-700">Warning: {w}</p>)}<Button disabled={!selectedRecords.size} onClick={apply} className="gap-2"><Check size={15}/>Approve and Apply Selected</Button></div>}</section>
      <p className="text-center text-[11px] text-muted-foreground">LifeGrid {APP_VERSION} · Universal AI Interchange v3</p>
    </main>
  </div>;
};
function WorkflowCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) { return <button onClick={onClick} className={`text-left rounded-xl border p-4 ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card'}`}><h2 className="font-semibold text-sm">{title}</h2><p className="text-xs text-muted-foreground mt-1">{description}</p></button>; }


type PreviewRecord = { key: string; group: string; operation: 'New' | 'Update'; label: string; id: string; detail?: string };
const toRecordGroups = (update: ParsedUpdate): { title: string; records: PreviewRecord[] }[] => {
  const groups: { title: string; records: PreviewRecord[] }[] = [];
  const add = (title: string, source: any, label: (record: any) => string, detail: (record: any) => string | undefined = () => undefined) => {
    const records = ['add', 'update'].flatMap(operation => (source?.[operation] ?? []).map((record: any, index: number) => ({ key: `${title}:${operation}:${record.id}:${index}`, group: title, operation: operation === 'add' ? 'New' as const : 'Update' as const, label: label(record), id: String(record.id), detail: detail(record) })));
    if (records.length) groups.push({ title, records });
  };
  add('Categories', update.categories, r => r.label ?? 'Untitled category');
  add('People', update.people, r => r.label ?? 'Untitled person');
  add('Projects', update.projects, r => r.name ?? 'Untitled project');
  add('Tasks', update.tasks, r => r.name ?? 'Untitled task', r => [r.dueDate, r.projectId && `Project: ${r.projectId}`].filter(Boolean).join(' · ') || undefined);
  add('Events', update.events, r => r.title ?? 'Untitled event', r => [r.date, r.category && `Category: ${r.category}`].filter(Boolean).join(' · ') || undefined);
  add('Schedule or Availability', update.peopleSchedule, r => r.title ?? 'Availability', r => [r.date, r.person && `Person: ${r.person}`].filter(Boolean).join(' · ') || undefined);
  return groups;
};
const filterSelectedUpdate = (update: ParsedUpdate, selected: Set<string>): ParsedUpdate => {
  const groups = toRecordGroups(update); const allowed = new Set(groups.flatMap(group => group.records.filter(record => selected.has(record.key)).map(record => record.key)));
  const clone: ParsedUpdate = JSON.parse(JSON.stringify(update));
  const sources: Array<[keyof ParsedUpdate, string]> = [['categories','Categories'], ['people','People'], ['projects','Projects'], ['tasks','Tasks'], ['events','Events'], ['peopleSchedule','Schedule or Availability']];
  sources.forEach(([sourceKey, title]) => { const source: any = clone[sourceKey]; if (!source) return; ['add','update'].forEach(operation => { source[operation] = (source[operation] ?? []).filter((record: any, index: number) => allowed.has(`${title}:${operation}:${record.id}:${index}`)); }); });
  return clone;
};
