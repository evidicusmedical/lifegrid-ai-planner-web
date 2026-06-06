import React, { useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Trash2, Check, X, Pencil, Copy, Download, Upload,
  CalendarDays, Tag, Users, Database, Eraser, Smartphone,
  FolderOpen, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Category, Person, Project } from '../types';
import { formatDate } from '../lib/format';

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
        <p className="text-xs text-muted-foreground mt-0.5">Customize categories, people, projects, versions, and your data.</p>
      </div>

      <div className="p-4 pb-24 space-y-6">
        <CalendarVersions />
        <CategoryManager />
        <ProjectManager />
        <PeopleManager />
        <InstallSection />
        <DataManager />
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
  const { calendars, activeCalendarId, switchCalendar, createCalendar, duplicateCalendar, renameCalendar, deleteCalendar } = useAppData();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const create = (seed: 'empty' | 'sample') => {
    const name = newName.trim() || (seed === 'sample' ? 'Sample Calendar' : 'New Calendar');
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

      <div className="pt-1 flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New version name…" className="h-9 text-xs flex-1" data-testid="input-new-calendar" />
        <Button size="sm" variant="secondary" onClick={() => create('empty')} className="gap-1 h-9" data-testid="button-create-empty">
          <Plus size={13} /> Empty
        </Button>
        <Button size="sm" variant="secondary" onClick={() => create('sample')} className="gap-1 h-9" data-testid="button-create-sample">
          <Plus size={13} /> Sample
        </Button>
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

// ─── Projects ────────────────────────────────────────────────────────────────
function ProjectManager() {
  const { projects, tasks, addProject, updateProject, deleteProject } = useAppData();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[2]);

  const taskCountForProject = (id: string) => tasks.filter(t => t.projectId === id).length;

  const submit = () => {
    const l = label.trim();
    if (!l) { toast.error('Enter a project name'); return; }
    const id = `proj-${Date.now()}`;
    addProject({ id, name: l, color });
    setLabel(''); setColor(PRESET_COLORS[2]); setAdding(false);
    toast.success(`Added project "${l}"`);
  };

  return (
    <Section icon={<FolderOpen size={16} />} title="Projects" subtitle="Group related tasks under a project or major initiative.">
      {projects.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-2">No projects yet — add one to group tasks together.</p>
      )}
      {projects.map(proj => (
        <ProjectRow
          key={proj.id}
          proj={proj}
          taskCount={taskCountForProject(proj.id)}
          onUpdate={updateProject}
          onDelete={deleteProject}
        />
      ))}

      {adding ? (
        <div className="p-2 rounded-lg border border-border space-y-2">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Project name…" className="h-8 text-xs" autoFocus data-testid="input-new-project" />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} className="flex-1 h-8" data-testid="button-save-project">Add</Button>
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setLabel(''); }} className="flex-1 h-8">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)} className="w-full gap-1 h-9" data-testid="button-add-project">
          <Plus size={14} /> Add project
        </Button>
      )}
    </Section>
  );
}

function ProjectRow({ proj, taskCount, onUpdate, onDelete }: {
  proj: Project; taskCount: number;
  onUpdate: (id: string, u: Partial<Project>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(proj.name);
  const [color, setColor] = useState(proj.color);

  if (editing) {
    return (
      <div className="p-2 rounded-lg border border-border space-y-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} className="h-8 text-xs" />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onUpdate(proj.id, { name: label.trim() || proj.name, color }); setEditing(false); }} className="flex-1 h-8">Save</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setLabel(proj.name); setColor(proj.color); }} className="flex-1 h-8">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border">
      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block truncate">{proj.name}</span>
        <span className="text-[10px] text-muted-foreground">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
      </div>
      <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-foreground" data-testid={`edit-proj-${proj.id}`}>
        <Pencil size={14} />
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="p-1.5 text-muted-foreground hover:text-destructive" data-testid={`del-proj-${proj.id}`}>
            <Trash2 size={14} />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{proj.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the project. The {taskCount} task{taskCount !== 1 ? 's' : ''} linked to it will remain but will no longer have a project. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(proj.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
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
    addPerson({ id, label: l, color });
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

  const sortedEvents = [...app.events].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedEvents.length === 0) {
    lines.push('  (none)');
  } else {
    sortedEvents.forEach(e => {
      const time = e.startTime ? `  ${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : '';
      const cat = app.categories.find(c => c.id === e.category)?.label ?? e.category;
      lines.push(`${e.date}${time}  [${cat}]  ${e.title}${e.notes ? `  // ${e.notes}` : ''}`);
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
      let row = `[${t.priority.toUpperCase().padEnd(6)}] ${t.name}  due:${t.dueDate ?? 'none'}  status:${t.status}  [${cat}]`;
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
    <Section icon={<Smartphone size={16} />} title="Install & use offline" subtitle="Works without Wi-Fi once installed.">
      <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
        <div>
          <p className="font-semibold text-foreground mb-1">📱 iPhone / iPad (Safari)</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Tap the <strong className="text-foreground">Share</strong> button (box with arrow ↑)</li>
            <li>Scroll down → tap <strong className="text-foreground">Add to Home Screen</strong></li>
            <li>Tap <strong className="text-foreground">Add</strong> — opens like a native app</li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">🤖 Android (Chrome)</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Tap the <strong className="text-foreground">⋮ menu</strong> in Chrome</li>
            <li>Tap <strong className="text-foreground">Add to Home screen</strong> or <strong className="text-foreground">Install app</strong></li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">💻 Desktop (Chrome / Edge)</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Look for the <strong className="text-foreground">install ⊕ icon</strong> in the address bar</li>
            <li>Click <strong className="text-foreground">Install</strong></li>
          </ol>
        </div>
        <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border">
          Once installed the app loads instantly and works fully offline. All your data stays on this device — nothing is sent to any server.
        </p>
      </div>
    </Section>
  );
}

// ─── Data backup / restore / clear ────────────────────────────────────────────
function DataManager() {
  const app = useAppData();
  const { exportBackup, importBackup, clearActiveCalendar, activeCalendar, lastBackupAt, recordBackup } = app;
  const fileRef = useRef<HTMLInputElement>(null);

  const daysSince = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
    : null;
  const backupOk = daysSince !== null && daysSince < 7;

  const handleExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifegrid-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded');
    recordBackup();
  };

  const handleTextExport = () => {
    const text = buildTextExport(app);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifegrid-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Text export downloaded', { description: 'Open the .txt file to read or share your schedule.' });
  };

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
    <Section icon={<Database size={16} />} title="Data & backup" subtitle="All data lives on your device. Export regularly.">
      {!backupOk && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 mb-1">
          {daysSince === null
            ? 'No backup yet — download one now to be safe.'
            : `Last backup was ${daysSince} day${daysSince !== 1 ? 's' : ''} ago. Consider making a fresh one.`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={handleExport} className="gap-1.5 h-9 text-xs" data-testid="button-export-backup">
          <Download size={14} /> JSON backup
        </Button>
        <Button size="sm" variant="secondary" onClick={handleTextExport} className="gap-1.5 h-9 text-xs" data-testid="button-export-text">
          <Download size={14} /> Export .txt
        </Button>
      </div>

      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="w-full gap-1.5 h-9 text-xs" data-testid="button-import-backup">
        <Upload size={14} /> Restore from backup
      </Button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <div className="pt-1 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-2">
          Active calendar: <strong className="text-foreground">{activeCalendar.name}</strong> · {activeCalendar.data.events.length} events · {activeCalendar.data.tasks.length} tasks
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
