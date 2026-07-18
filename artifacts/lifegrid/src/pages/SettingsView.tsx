import React, { useMemo, useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Trash2, Check, X, Pencil, Copy, Download, Upload,
  CalendarDays, Tag, Users, Database, Eraser, Smartphone,
  FolderOpen, ChevronUp, ChevronDown, FileText,
} from 'lucide-react';
import { Category, Person, Project, ProjectStatus } from '../types';
import { formatDate } from '../lib/format';
import { downloadCurrentBackup } from '../lib/backup';
import { dateIsInRange, exportRangeFor, formatExportRange, type ExportPreset, validateDateRange } from '../lib/exportUtils';
import { buildLifeGridExportFilename, exportFilename } from '../lib/exportFilenames';
import { temporalSummary } from '../lib/temporal';
import { compareReviewFindings, deriveFlaggedReviewState, quickTemporalConfirmation, reviewRefreshMessage } from '../lib/timeReview';
import { buildIcsExport } from '../lib/icsExport';
import { planProjectTagDeletion, projectTagUsage, sortProjectTags, validateProjectTag } from '../lib/projectOperations';
import { EventSheet } from '../components/EventSheet';
import { PersonEventSheet } from '../components/PersonEventSheet';

const PRESET_COLORS = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#6b7280',
  '#0891b2', '#db2777', '#65a30d', '#9333ea', '#ea580c', '#0d9488',
];

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${Date.now()}`;

export const SettingsView = () => {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none p-4 pb-3 border-b border-border bg-card sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Customize categories, people, Project Tags, versions, and your data.</p>
      </div>

      <div className="p-4 pb-24 space-y-6">
        <CalendarVersions />
        <TimeDataReview />
        <CategoryManager />
        <ProjectManager />
        <PeopleManager />
        <InstallSection />
        <DataManager />
        <ExportManager />
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full transition-transform ${value === c ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110' : ''}`}
          style={{ backgroundColor: c }}
          data-testid={`color-${c}`}
        />
      ))}
    </div>
  );
}

// ─── Calendar versions ────────────────────────────────────────────────────────
function CalendarVersions() {
  const { calendars, activeCalendarId, activeCalendar, switchCalendar, createCalendar, duplicateCalendar, renameCalendar, deleteCalendar, canResetActiveCalendarToTrulyEmpty, resetActiveCalendarToTrulyEmpty } = useAppData();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const create = (seed: 'empty' | 'copy-structure' | 'sample') => {
    const name = newName.trim() || (seed === 'sample' ? 'Sample Calendar' : seed === 'copy-structure' ? 'Structured Calendar' : 'New Calendar');
    createCalendar(name, seed);
    setNewName('');
    toast.success(`Created "${name}"`);
  };

  return (
    <Section icon={<CalendarDays size={16} />} title="Calendar versions" subtitle="Keep multiple plans; switch anytime.">
      {calendars.map(cal => {
        const active = cal.id === activeCalendarId;
        const isEditing = editingId === cal.id;
        return (
          <div key={cal.id} className={`flex items-center gap-2 p-2 rounded-lg border ${active ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
            {isEditing ? (
              <>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-xs flex-1" autoFocus />
                <button onClick={() => { renameCalendar(cal.id, editName.trim() || cal.name); setEditingId(null); }} className="p-1.5 text-green-600" data-testid={`save-cal-${cal.id}`}>
                  <Check size={15} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground">
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => switchCalendar(cal.id)} className="flex-1 text-left min-w-0" data-testid={`switch-cal-${cal.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{cal.name}</span>
                    {active && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">ACTIVE</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {cal.data.events.length} events · {cal.data.tasks.length} tasks · {formatDate(cal.createdAt.slice(0, 10))}
                  </span>
                </button>
                <button onClick={() => { setEditingId(cal.id); setEditName(cal.name); }} className="p-1.5 text-muted-foreground hover:text-foreground" data-testid={`rename-cal-${cal.id}`}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => { duplicateCalendar(cal.id); toast.success('Duplicated'); }} className="p-1.5 text-muted-foreground hover:text-foreground" data-testid={`dup-cal-${cal.id}`}>
                  <Copy size={14} />
                </button>
                {calendars.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 text-muted-foreground hover:text-destructive" data-testid={`del-cal-${cal.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{cal.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes this calendar version and all {cal.data.events.length} events and {cal.data.tasks.length} tasks in it. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { deleteCalendar(cal.id); toast.success('Deleted'); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        );
      })}

      {canResetActiveCalendarToTrulyEmpty && <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline" className="w-full text-destructive">Reset to Truly Empty</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reset "{activeCalendar.name}" to Truly Empty?</AlertDialogTitle><AlertDialogDescription>This removes all categories except Other, all people, and all projects. Events, tasks, and people schedule entries are already empty. Other calendar versions are unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { resetActiveCalendarToTrulyEmpty(); toast.success('Calendar reset to truly empty'); }}>Reset</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      <div className="pt-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New version name…" className="h-9 text-xs" data-testid="input-new-calendar" />
        <Button title="Start with no planning data, people, projects, or custom tags." size="sm" variant="secondary" onClick={() => create('empty')} className="gap-1 h-9"><Plus size={13} /> Empty</Button>
        <Button title="Reuse categories, people, and projects without copying events or tasks." size="sm" variant="secondary" onClick={() => create('copy-structure')} className="gap-1 h-9"><Copy size={13} /> Copy Structure</Button>
        <Button title="Create a fictional example calendar." size="sm" variant="secondary" onClick={() => create('sample')} className="gap-1 h-9"><Plus size={13} /> Sample</Button>
      </div>
    </Section>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────
function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories } = useAppData();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const submit = () => {
    const l = label.trim();
    if (!l) { toast.error('Enter a category name'); return; }
    const id = slug(l);
    if (categories.some(c => c.id === id)) { toast.error('That category already exists'); return; }
    addCategory({ id, label: l, color });
    setLabel(''); setColor(PRESET_COLORS[0]); setAdding(false);
    toast.success(`Added "${l}"`);
  };

  return (
    <Section icon={<Tag size={16} />} title="Categories / tags" subtitle="Used to color and filter events and tasks. Drag to reorder.">
      {categories.map((cat, idx) => (
        <CategoryRow
          key={cat.id}
          cat={cat}
          idx={idx}
          total={categories.length}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onMoveUp={() => reorderCategories(idx, idx - 1)}
          onMoveDown={() => reorderCategories(idx, idx + 1)}
        />
      ))}

      {adding ? (
        <div className="p-2 rounded-lg border border-border space-y-2">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Category name…" className="h-8 text-xs" autoFocus data-testid="input-new-category" />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} className="flex-1 h-8" data-testid="button-save-category">Add</Button>
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setLabel(''); }} className="flex-1 h-8">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)} className="w-full gap-1 h-9" data-testid="button-add-category">
          <Plus size={14} /> Add category
        </Button>
      )}
    </Section>
  );
}

function CategoryRow({ cat, idx, total, onUpdate, onDelete, onMoveUp, onMoveDown }: {
  cat: Category;
  idx: number;
  total: number;
  onUpdate: (id: string, u: Partial<Category>) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(cat.label);
  const [color, setColor] = useState(cat.color);

  if (editing) {
    return (
      <div className="p-2 rounded-lg border border-border space-y-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} className="h-8 text-xs" />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onUpdate(cat.id, { label: label.trim() || cat.label, color }); setEditing(false); }} className="flex-1 h-8">Save</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setLabel(cat.label); setColor(cat.color); }} className="flex-1 h-8">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border">
      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
      <span className="text-sm font-medium flex-1 truncate">{cat.label}</span>

      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={idx === 0}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25"
          title="Move up"
          data-testid={`cat-up-${cat.id}`}
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={idx >= total - 1}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25"
          title="Move down"
          data-testid={`cat-down-${cat.id}`}
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-foreground" data-testid={`edit-cat-${cat.id}`}>
        <Pencil size={14} />
      </button>
      {cat.id !== 'other' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="p-1.5 text-muted-foreground hover:text-destructive" data-testid={`del-cat-${cat.id}`}>
              <Trash2 size={14} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{cat.label}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Events and tasks using this category will be moved to "Other". This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(cat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Project Tags ───────────────────────────────────────────────────────────
function ProjectManager() {
  const app = useAppData(); const [open,setOpen]=useState(false), [search,setSearch]=useState(''), [draft,setDraft]=useState<Project | null>(null), [deleting,setDeleting]=useState<Project | null>(null), [policy,setPolicy]=useState<'clear'|'reassign'>('clear'), [destination,setDestination]=useState('');
  const usage=useMemo(()=>projectTagUsage(app.projects,app.tasks,app.events),[app.projects,app.tasks,app.events]); const tags=sortProjectTags(app.projects).filter(p=>!search.trim() || [p.name,...(p.aliases??[])].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const save=()=>{ if(!draft)return; const valid=validateProjectTag(draft,app.projects,draft.id); if(!valid.ok){toast.error(valid.error);return;} if(app.projects.some(p=>p.id===draft.id)) app.updateProject(draft.id,{...valid.value,status:draft.status,notes:draft.notes??null}); else app.addProject({...draft,...valid.value,order:app.projects.length,status:'active',notes:null}); setDraft(null); toast.success('Project Tag saved'); };
  const remove=()=>{if(!deleting)return; const plan=planProjectTagDeletion(app,deleting.id,policy,destination); if(!plan.ok){toast.error(plan.error);return;} try {app.deleteProject(deleting.id,policy,destination); setDeleting(null);toast.success('Project Tag deleted');}catch(e){toast.error(e instanceof Error?e.message:'Unable to delete Project Tag');}};
  return <Section icon={<FolderOpen size={16}/>} title="Project Tags" subtitle="Project Tags organize Tasks and related Events without creating a separate project-management workspace.">
    <button className="text-xs underline" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'Collapse Project Tags':'Manage Project Tags'}</button>
    {open&&<div className="space-y-2" data-testid="project-tag-manager"><Label htmlFor="project-tag-search">Search Project Tags</Label><div className="flex gap-2"><Input id="project-tag-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or alias"/><Button type="button" variant="outline" onClick={()=>setSearch('')}>Clear search</Button></div>
    {!tags.length&&<p className="py-3 text-center text-xs text-muted-foreground">No Project Tags match. Create one to organize Tasks.</p>}
    {tags.map((p,i)=>{const u=usage[p.id];return <div key={p.id} className="rounded-lg border p-3" data-testid={`project-tag-${p.id}`}><div className="flex flex-wrap items-start gap-2"><span className="mt-1 h-3 w-3 rounded-full" style={{backgroundColor:p.color}} aria-label={`${p.name} color`}/><div className="min-w-0 flex-1"><strong className="wrap-anywhere">{p.name}</strong>{p.status==='archived'&&<span className="ml-2 text-xs">Archived</span>}<p className="wrap-anywhere text-xs text-muted-foreground">{p.aliases?.length?`Aliases: ${p.aliases.join(', ')}`:'No aliases'} · {u.openTasks} open, {u.completedTasks} completed, {u.relatedEvents} related events</p></div><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" aria-label={`Move ${p.name} up`} disabled={!i} onClick={()=>app.reorderProjects(i,i-1)}>↑</Button><Button size="sm" variant="outline" aria-label={`Move ${p.name} down`} disabled={i===tags.length-1} onClick={()=>app.reorderProjects(i,i+1)}>↓</Button><Button size="sm" variant="outline" onClick={()=>setDraft({...p,aliases:[...(p.aliases??[])]})}>Edit</Button><Button size="sm" variant="outline" onClick={()=>app.updateProject(p.id,{status:p.status==='archived'?'active':'archived'})}>{p.status==='archived'?'Unarchive':'Archive'}</Button><Button size="sm" variant="outline" onClick={()=>setDeleting(p)}>Delete</Button></div></div></div>})}
    <Button className="w-full" variant="secondary" onClick={()=>setDraft({id:`proj-${crypto.randomUUID()}`,name:'',color:PRESET_COLORS[2],aliases:[],order:app.projects.length,status:'active',notes:null})}>Create Project Tag</Button></div>}
    {draft&&<div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" role="dialog" aria-label="Project Tag editor"><div className="w-full space-y-3 rounded-t-xl bg-background p-4 sm:max-w-md sm:rounded-xl"><h2>{app.projects.some(p=>p.id===draft.id)?'Edit':'Create'} Project Tag</h2><Label>Name<Input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></Label><ColorPicker value={draft.color} onChange={color=>setDraft({...draft,color})}/><Label>Aliases (comma-separated)<Input value={draft.aliases.join(', ')} onChange={e=>setDraft({...draft,aliases:e.target.value.split(',')})}/></Label><Label>Notes<Textarea value={draft.notes??''} onChange={e=>setDraft({...draft,notes:e.target.value||null})}/></Label><div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={()=>setDraft(null)}>Cancel</Button></div></div></div>}
    {deleting&&<AlertDialog open onOpenChange={v=>!v&&setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Project Tag “{deleting.name}”?</AlertDialogTitle><AlertDialogDescription>{usage[deleting.id].totalTasks?`${usage[deleting.id].openTasks} open Tasks, ${usage[deleting.id].completedTasks} completed Tasks, and ${usage[deleting.id].relatedEvents} related Events will remain. Choose how to update Task tags.`:'This unused Project Tag can be deleted.'}</AlertDialogDescription></AlertDialogHeader>{usage[deleting.id].totalTasks>0&&<><Label>Task handling<select className="ml-2" value={policy} onChange={e=>setPolicy(e.target.value as 'clear'|'reassign')}><option value="clear">Remove Project Tag from Tasks</option><option value="reassign">Reassign Tasks</option></select></Label>{policy==='reassign'&&<Label>Reassign to<select className="ml-2" value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Choose active Project Tag</option>{app.projects.filter(p=>p.id!==deleting.id&&p.status!=='archived').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Label>}</>}<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete Project Tag</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
  </Section>;
}

// ─── People ───────────────────────────────────────────────────────────────────
function PeopleManager() {
  const { people, addPerson, updatePerson, deletePerson } = useAppData();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[4]);

  const submit = () => {
    const l = label.trim();
    if (!l) { toast.error('Enter a name'); return; }
    const id = slug(l);
    if (people.some(p => p.id === id)) { toast.error('That person already exists'); return; }
    addPerson({ id, label: l, color, order: people.length });
    setLabel(''); setColor(PRESET_COLORS[4]); setAdding(false);
    toast.success(`Added "${l}"`);
  };

  return (
    <Section icon={<Users size={16} />} title="People" subtitle="Sections on the People tab for tracking others.">
      {people.map(person => (
        <PersonRow key={person.id} person={person} onUpdate={updatePerson} onDelete={deletePerson} />
      ))}

      {adding ? (
        <div className="p-2 rounded-lg border border-border space-y-2">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name (e.g. Partner, Kids)…" className="h-8 text-xs" autoFocus data-testid="input-new-person" />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} className="flex-1 h-8" data-testid="button-save-person">Add</Button>
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setLabel(''); }} className="flex-1 h-8">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)} className="w-full gap-1 h-9" data-testid="button-add-person">
          <Plus size={14} /> Add person
        </Button>
      )}
    </Section>
  );
}

function PersonRow({ person, onUpdate, onDelete }: {
  person: Person; onUpdate: (id: string, u: Partial<Person>) => void; onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(person.label);
  const [color, setColor] = useState(person.color);

  if (editing) {
    return (
      <div className="p-2 rounded-lg border border-border space-y-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} className="h-8 text-xs" />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onUpdate(person.id, { label: label.trim() || person.label, color }); setEditing(false); }} className="flex-1 h-8">Save</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setLabel(person.label); setColor(person.color); }} className="flex-1 h-8">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border">
      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: person.color }} />
      <span className="text-sm font-medium flex-1 truncate">{person.label}</span>
      <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-foreground" data-testid={`edit-person-${person.id}`}>
        <Pencil size={14} />
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="p-1.5 text-muted-foreground hover:text-destructive" data-testid={`del-person-${person.id}`}>
            <Trash2 size={14} />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{person.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes this person and all of their schedule entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(person.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TimeDataReview() {
  const { events, personEvents, activeCalendar, updateEvent, updatePersonEvent, deleteEvent, deletePersonEvent } = useAppData();
  const [kind, setKind] = useState('all'); const [code, setCode] = useState('all'); const [expanded, setExpanded] = useState(false); const [reviewLoaded, setReviewLoaded] = useState(false);
  const [state, setState] = useState<ReturnType<typeof deriveFlaggedReviewState> | null>(null); const [showAll, setShowAll] = useState(false); const [groups, setGroups] = useState<Record<string, boolean>>({}); const [result, setResult] = useState(''); const [refreshing, setRefreshing] = useState(false); const [editing, setEditing] = useState<any>(null); const [originKey, setOriginKey] = useState<string | null>(null);
  const derive = (postMutation = false) => { const previous = state?.rawFindings ?? []; const next = deriveFlaggedReviewState({ events, personEvents }); const comparison = compareReviewFindings(previous, next.rawFindings); setState(next); setReviewLoaded(true); if (import.meta.env.DEV && next.unmappedFindings.length) console.warn('[lifegrid:review] unmapped issue codes', [...new Set(next.unmappedFindings.map(f => f.code))]); if (postMutation && originKey) setResult(!next.itemsByKey.has(originKey) ? (next.items.some(i => i.recordId === originKey.split(':')[1]) ? 'Record saved; a different issue remains.' : 'Resolved record.') : 'This record still requires review.'); else setResult(reviewRefreshMessage(comparison)); };
  const refresh = () => { if (refreshing) return; setRefreshing(true); try { derive(); } catch { setResult('Review could not be refreshed. Previous results may be stale; try Refresh again.'); } finally { setRefreshing(false); } };
  React.useEffect(() => { setState(null); setReviewLoaded(false); setEditing(null); setOriginKey(null); }, [activeCalendar.id]);
  // State-driven reconciliation: once opened, committed collections replace the complete derived result.
  React.useEffect(() => { if (reviewLoaded) derive(!!originKey); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [events, personEvents]);
  const items = state?.items ?? []; const visible = items.filter(issue => (kind === 'all' || issue.recordType === kind) && (code === 'all' || issue.issueCode === code)); const grouped = visible.reduce<Record<string, typeof visible>>((out, issue) => { (out[issue.issueCode] ??= []).push(issue); return out; }, {});
  const open = (issue: typeof items[number]) => { const record = (issue.recordType === 'event' ? events : personEvents).find(record => record.id === issue.recordId); if (!record) { refresh(); return; } setOriginKey(issue.issueKey); setEditing({ issue, record }); };
  const confirm = (issue: typeof items[number], choice: 'all-day' | 'unknown') => { const record = (issue.recordType === 'event' ? events : personEvents).find(r => r.id === issue.recordId); if (!record) return refresh(); setOriginKey(issue.issueKey); setResult('Rechecking…'); const update = quickTemporalConfirmation(record, choice); if (issue.recordType === 'event') updateEvent(issue.recordId, update); else updatePersonEvent(issue.recordId, update); };
  const remove = (issue: typeof items[number]) => { if (!window.confirm(`Delete '${issue.title}'?`)) return; setOriginKey(issue.issueKey); setResult('Rechecking…'); if (issue.recordType === 'event') deleteEvent(issue.recordId); else deletePersonEvent(issue.recordId); };
  return <><Section icon={<CalendarDays size={16}/>} title="Flagged Items for Review" subtitle="Active calendar only."><p className="text-xs text-muted-foreground">Only current, concrete temporal risks requiring action are listed.</p><div className="flex flex-wrap gap-2 text-xs"><b>{reviewLoaded ? `${state?.counts.total ?? 0} flagged items` : 'Open to analyze current temporal records'}</b>{reviewLoaded && <span>{visible.length} visible</span>}</div><div className="rounded-lg bg-muted/30 p-3"><Button className="min-h-11 w-full sm:w-auto" onClick={refresh} disabled={refreshing} aria-label="Refresh Flagged Items for Review" data-testid="refresh-flagged-review">{refreshing ? 'Refreshing…' : 'Refresh Review'}</Button><p className="mt-1 text-xs" aria-live="polite">{result}</p></div><Button size="sm" variant="outline" className="min-h-11" onClick={() => { const next = !expanded; setExpanded(next); if (next && !reviewLoaded) refresh(); }} aria-expanded={expanded} data-testid="time-review-toggle">{expanded ? 'Collapse' : 'Expand'} review</Button>{expanded && <><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><select value={kind} onChange={e => setKind(e.target.value)}><option value="all">All records</option><option value="event">Events</option><option value="person-schedule">People schedule</option></select><select value={code} onChange={e => setCode(e.target.value)}><option value="all">All issue types</option>{[...new Set(items.map(issue => issue.issueCode))].map(value => <option key={value}>{value}</option>)}</select></div><Button size="sm" variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show first five' : 'Show All'}</Button>{Object.entries(grouped).map(([group, issues]) => { const shown = showAll || groups[group] ? issues : issues.slice(0,5); return <div key={group} className="rounded border p-2 space-y-2"><button onClick={() => setGroups({...groups,[group]:!groups[group]})}>{group} ({issues.length})</button>{shown.map(issue => <div key={issue.issueKey} className="flex flex-wrap justify-between gap-2 rounded bg-muted/30 p-2 text-xs"><div><b>{issue.title}</b><p>{issue.reason}</p>{issue.question && <p>{issue.question}</p>}<span className="text-destructive">{issue.recordType === 'event' ? 'Event' : 'Person Schedule'} · {issue.severity} · {issue.source.replace('-', ' ')}</span></div><div className="flex gap-1"><Button size="sm" onClick={() => open(issue)}>Edit Record</Button>{issue.allowedActions.includes('confirm-all-day') && <Button size="sm" onClick={() => confirm(issue,'all-day')}>Confirm All Day</Button>}{issue.allowedActions.includes('confirm-time-unknown') && <Button size="sm" onClick={() => confirm(issue,'unknown')}>Confirm Time Unknown</Button>}<Button size="sm" variant="destructive" onClick={() => remove(issue)}>Delete Record</Button></div></div>)}</div>; })}</>}</Section>{editing?.issue.recordType === 'event' ? <EventSheet isOpen onClose={() => setEditing(null)} initialData={editing.record} onSaved={() => { setEditing(null); setResult('Rechecking…'); }} /> : editing ? <PersonEventSheet isOpen onClose={() => setEditing(null)} initialData={editing.record} onSaved={() => { setEditing(null); setResult('Rechecking…'); }} /> : null}</>;
}

// ─── Condensed text export ─────────────────────────────────────────────────────
function buildTextExport(app: ReturnType<typeof useAppData>): string {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines: string[] = [
    `LIFEGRID DATA EXPORT — ${dateStr}`,
    `Calendar: ${app.activeCalendar.name}`,
    `Events: ${app.events.length}  |  Tasks: ${app.tasks.length}  |  People entries: ${app.personEvents.length}`,
    '',
    '═══════════════════════════════════════',
    'EVENTS',
    '═══════════════════════════════════════',
  ];

  const sortedEvents = app.events.slice().sort((a, b) => a.date.localeCompare(b.date));
  if (sortedEvents.length === 0) {
    lines.push('  (none)');
  } else {
    sortedEvents.forEach(e => {
      const time = `  ${temporalSummary(e)}`;
      const cat = app.categories.find(c => c.id === e.category)?.label ?? e.category;
      lines.push(`${e.date}${time}  [${cat}]  ${e.title}  priority:${e.displayPriority ?? 4}${e.notes ? `  // ${e.notes}` : ''}`);
    });
  }

  if (app.projects.length > 0) {
    lines.push('', '═══════════════════════════════════════', 'PROJECTS', '═══════════════════════════════════════');
    [...app.projects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)).forEach(p => {
      const taskCount = app.tasks.filter(t => t.projectId === p.id).length;
      const doneCount = app.tasks.filter(t => t.projectId === p.id && t.status === 'done').length;
      let row = `${p.order ?? 0}. ${p.name}  status:${p.status ?? 'active'}  tasks:${doneCount}/${taskCount}`;
      if (p.aliases?.length) row += `  aliases:${p.aliases.join(', ')}`;
      if (p.notes) row += `  // ${p.notes}`;
      lines.push(row);
    });
  }

  lines.push('', '═══════════════════════════════════════', 'TASKS', '═══════════════════════════════════════');

  const rankOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sortedTasks = [...app.tasks].sort((a, b) => (rankOrder[a.priority] ?? 9) - (rankOrder[b.priority] ?? 9));
  if (sortedTasks.length === 0) {
    lines.push('  (none)');
  } else {
    sortedTasks.forEach(t => {
      const cat = app.categories.find(c => c.id === t.category)?.label ?? t.category;
      let row = `[${t.priority.toUpperCase().padEnd(6)}] ${t.name}  due:${t.dueDate ?? 'none'}  dueType:${t.dueDateType ?? 'target-date'}  triage:${t.triageStatus ?? 'ready'}  status:${t.status}  [${cat}]`;
      if (t.nextAction) row += `  → ${t.nextAction}`;
      if (t.notes) row += `  // ${t.notes}`;
      if (t.schedulingNotes) row += `  ⚙ ${t.schedulingNotes}`;
      lines.push(row);
    });
  }

  if (app.personEvents.length > 0) {
    lines.push('', '═══════════════════════════════════════', 'PEOPLE\'S SCHEDULE', '═══════════════════════════════════════');
    [...app.personEvents].sort((a, b) => a.date.localeCompare(b.date)).forEach(pe => {
      const personName = app.people.find(p => p.id === pe.person)?.label ?? pe.person;
      const time = pe.startTime ? `  ${pe.startTime}${pe.endTime ? `–${pe.endTime}` : ''}` : '';
      lines.push(`${pe.date}${time}  [${personName}]  ${pe.title}`);
    });
  }

  lines.push('', '─── End of export ───');
  return lines.join('\n');
}

// ─── Install & offline section ────────────────────────────────────────────────
function InstallSection() {
  return (
    <Section icon={<Smartphone size={16} />} title="Install & use offline" subtitle="Optional shortcut; the app remains local-first.">
      <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
        <p>
          Install LifeGrid from your browser menu for a home-screen app experience. Once loaded, the PWA works offline and keeps data on this device/browser.
        </p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong className="text-foreground">iPhone/iPad:</strong> Safari Share → Add to Home Screen.</li>
          <li><strong className="text-foreground">Android:</strong> Chrome ⋮ menu → Add to Home screen / Install app.</li>
          <li><strong className="text-foreground">Desktop:</strong> use the browser install icon when available.</li>
        </ul>
      </div>
    </Section>
  );
}


function ExportManager() {
  const app = useAppData();
  const [preset, setPreset] = useState<ExportPreset>('all');
  const [customStart, setCustomStart] = useState(''); const [customEnd, setCustomEnd] = useState('');
  const [category, setCategory] = useState('all');
  const [timeMode, setTimeMode] = useState<'preserve' | 'utc'>('preserve');
  const range = exportRangeFor(preset, { start: customStart || null, end: customEnd || null });
  const rangeError = preset === 'custom' ? validateDateRange(range) : null;
  const events = useMemo(() => app.events.filter(event => dateIsInRange(event.date, range) && (category === 'all' || event.category === category)), [app.events, range.start, range.end, category]);
  const download = (contents: string, filename: string, type: string) => { const url = URL.createObjectURL(new Blob([contents], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
  return <Section icon={<FileText size={16} />} title="Share or publish your schedule" subtitle="These exports are not restorable backups.">
    <p className="text-[11px] text-muted-foreground">Readable text is for review, printing, and sharing. ICS contains calendar/grid events only; projects, tasks, people, and People-tab schedules are not included unless represented as events.</p>
    <div className="flex flex-wrap gap-1">{([['month','Current Month'],['next30','Next 30 Days'],['next90','Next 90 Days'],['year','Current Year'],['all','All Events'],['custom','Custom Range']] as [ExportPreset,string][]).map(([id,label]) => <button key={id} onClick={() => setPreset(id)} className={`rounded px-2 py-1 text-[10px] font-semibold ${preset === id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{label}</button>)}</div>
    {preset === 'custom' && <div className="grid grid-cols-2 gap-2"><Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} aria-label="ICS export start"/><Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} aria-label="ICS export end"/></div>}
    {rangeError && <p role="alert" className="text-xs text-destructive">{rangeError}</p>}
    <select value={category} onChange={e => setCategory(e.target.value)} className="h-8 rounded border bg-background px-2 text-xs"><option value="all">All categories</option>{app.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
    <div className="space-y-1 text-[10px]"><label>Timed export <select value={timeMode} onChange={e => setTimeMode(e.target.value as 'preserve' | 'utc')} data-testid="ics-timezone-mode"><option value="preserve">Keep each event’s original timezone</option><option value="utc">Convert zoned events to UTC</option></select></label><p className="text-muted-foreground">Exports each zoned event using the timezone in which it was entered. UTC preserves the real-world instant but may change the displayed clock time elsewhere; all-day, floating, and unknown-time records are not converted into timed instants.</p></div><p className="text-[10px] text-muted-foreground">{formatExportRange(range)} · {category === 'all' ? 'All categories' : app.categories.find(c => c.id === category)?.label} · {events.length} event{events.length === 1 ? '' : 's'}</p>
    <div className="grid grid-cols-2 gap-2"><Button size="sm" variant="secondary" disabled={!!rangeError} onClick={() => { download(buildTextExport(app), exportFilename('text_export', app.activeCalendar.name, new Date()), 'text/plain'); toast.success('Text export downloaded', { description: 'Human-readable only — not restorable.' }); }}><Download size={14}/> Export readable text</Button><Button size="sm" variant="secondary" disabled={!!rangeError || !events.length} onClick={() => { download(buildIcsExport(app, events, { timeMode }), buildLifeGridExportFilename({ kind: 'ics_calendar', calendarName: app.activeCalendar.name, generatedAt: new Date() }), 'text/calendar'); toast.success('ICS exported', { description: `${events.length} calendar/grid event${events.length === 1 ? '' : 's'} exported.` }); }}><Download size={14}/> Export ICS calendar</Button></div>
    {!events.length && !rangeError && <p className="text-xs text-amber-700">No events match this range and category; ICS download is disabled.</p>}
    <Button size="sm" variant="outline" onClick={() => { setPreset('all'); setCategory('all'); setCustomStart(''); setCustomEnd(''); }}>Reset export filters</Button>
  </Section>;
}

// ─── Data backup / restore / clear ────────────────────────────────────────────
function DataManager() {
  const app = useAppData();
  const { importBackup, clearActiveCalendar, activeCalendar, lastBackupAt } = app;
  const fileRef = useRef<HTMLInputElement>(null);

  const daysSince = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
    : null;
  const backupOk = daysSince !== null && daysSince < 7;

  const handleExport = () => { downloadCurrentBackup(app); toast.success('JSON backup downloaded', { description: 'Saved locally to your device; it is not stored in the cloud.' }); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBackup(text);
      toast.success('Backup restored');
    } catch (err: any) {
      toast.error('Restore failed', { description: err?.message ?? 'Invalid backup file.' });
    }
    e.target.value = '';
  };

  return (
    <Section icon={<Database size={16} />} title="Preserve your LifeGrid" subtitle="Local JSON backup and restore; no cloud storage.">
      {!backupOk && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 mb-1">
          {daysSince === null
            ? 'No backup yet — download one now to be safe.'
            : `Last backup was ${daysSince} day${daysSince !== 1 ? 's' : ''} ago. Consider making a fresh one.`}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your data is stored only in this browser. Clearing site/browser data can remove it. A JSON backup preserves every calendar version in this browser and is the restorable format. Restoring a full backup replaces the current local calendar store; a single-calendar file is added as a new calendar.
        </p>
        <Button size="sm" variant="secondary" onClick={handleExport} className="w-full gap-1.5 h-9 text-xs" data-testid="button-export-backup">
          <Download size={14} /> Download restorable JSON backup
        </Button>
      </div>

      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="w-full gap-1.5 h-9 text-xs" data-testid="button-import-backup">
        <Upload size={14} /> Restore latest JSON backup
      </Button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <div className="pt-1 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-2">
          Selected calendar: <strong className="text-foreground">{activeCalendar.name}</strong> · {activeCalendar.data.events.length} events · {activeCalendar.data.tasks.length} tasks
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="w-full gap-1.5 h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/5" data-testid="button-clear-calendar">
              <Eraser size={14} /> Clear this calendar's data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear "{activeCalendar.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes all {activeCalendar.data.events.length} events, {activeCalendar.data.tasks.length} tasks, and {activeCalendar.data.personEvents.length} people entries from this calendar version. Categories and people are kept. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { clearActiveCalendar(); toast.success('Calendar cleared'); }}
              >
                Clear all data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Section>
  );
}
