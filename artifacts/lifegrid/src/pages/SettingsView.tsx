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
  CalendarDays, Tag, Users, Database, Eraser,
} from 'lucide-react';
import { Category, Person } from '../types';
import { formatDate } from '../lib/format';

const PRESET_COLORS = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#6b7280',
  '#0891b2', '#db2777', '#65a30d', '#9333ea', '#ea580c', '#0d9488',
];

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${Date.now()}`;

export const SettingsView = () => {
  const app = useAppData();

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none p-4 pb-3 border-b border-border bg-card sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Customize categories, people, versions, and your data.</p>
      </div>

      <div className="p-4 pb-24 space-y-6">
        <CalendarVersions />
        <CategoryManager />
        <PeopleManager />
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
  const { categories, addCategory, updateCategory, deleteCategory } = useAppData();
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
    <Section icon={<Tag size={16} />} title="Categories / tags" subtitle="Used to color and filter events and tasks.">
      {categories.map(cat => (
        <CategoryRow key={cat.id} cat={cat} onUpdate={updateCategory} onDelete={deleteCategory} />
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

function CategoryRow({ cat, onUpdate, onDelete }: {
  cat: Category; onUpdate: (id: string, u: Partial<Category>) => void; onDelete: (id: string) => void;
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

// ─── Data backup / restore / clear ────────────────────────────────────────────
function DataManager() {
  const { exportBackup, importBackup, clearActiveCalendar, activeCalendar } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);

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
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBackup(text);
      toast.success('Backup restored');
    } catch (err: any) {
      toast.error('Restore failed', { description: err.message ?? 'Invalid backup file.' });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <Section icon={<Database size={16} />} title="Data & backup" subtitle="Everything is stored only on this device.">
      <Button variant="secondary" onClick={handleExport} className="w-full gap-2 h-9" data-testid="button-export-backup">
        <Download size={14} /> Download backup (.json)
      </Button>

      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} data-testid="input-restore-backup" />
      <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full gap-2 h-9" data-testid="button-restore-backup">
        <Upload size={14} /> Restore from backup
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2 h-9 text-destructive border-destructive/30 hover:bg-destructive/10" data-testid="button-clear-calendar">
            <Eraser size={14} /> Clear this calendar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear "{activeCalendar.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all events, tasks, and people entries from the current calendar version. Categories and people definitions are kept. This cannot be undone — consider downloading a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearActiveCalendar(); toast.success('Calendar cleared'); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
