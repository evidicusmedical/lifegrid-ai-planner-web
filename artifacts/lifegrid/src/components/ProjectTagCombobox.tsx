import React, { useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Project } from '../types';
import { findProjectTagOptions, projectTagQuickCreateValidation, validateProjectTag } from '../lib/projectOperations';

interface Props { projects: readonly Project[]; value: string | null | undefined; onChange: (id: string | null) => void; onCreate: (project: Project) => void; }
export const ProjectTagCombobox: React.FC<Props> = ({ projects, value, onChange, onCreate }) => {
  const listId = useId(), inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [showArchived, setShowArchived] = useState(false), [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [color, setColor] = useState('#2563eb'), [error, setError] = useState('');
  const selected = projects.find(p => p.id === value);
  const options = useMemo(() => findProjectTagOptions(projects, query, value, showArchived), [projects, query, value, showArchived]);
  const openList = () => { setOpen(true); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); };
  const select = (id: string | null) => { onChange(id); setOpen(false); setQuery(''); };
  const canCreate = projectTagQuickCreateValidation(query, projects).ok;
  const startCreate = () => { setName(query.trim()); setColor('#2563eb'); setError(''); setCreating(true); };
  const create = () => { const result = validateProjectTag({ name, color, aliases: [] }, projects); if (!result.ok) { setError(result.error); return; } const project = { id: crypto.randomUUID(), ...result.value, status: 'active' as const, notes: null, order: projects.length }; onCreate(project); onChange(project.id); setCreating(false); setOpen(false); setQuery(''); requestAnimationFrame(() => inputRef.current?.focus()); };
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => { if (e.key === 'Escape') { setOpen(false); return; } if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, options.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); } if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); select(options[active].id); } };
  const label = selected ? selected.name : value ? 'Unavailable Project Tag' : 'No Project Tag';
  return <div className="space-y-2" data-testid="project-tag-combobox">
    <div className="flex gap-2"><button type="button" className="flex min-h-10 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={openList} aria-label="Project Tag" aria-expanded={open} aria-controls={listId}>
      {selected && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />}{<span className="min-w-0 flex-1 truncate" title={label}>{label}</span>}{selected?.status === 'archived' && <span className="text-xs text-muted-foreground">Archived</span>}</button>
      {value && <Button type="button" variant="outline" size="sm" onClick={() => select(null)} aria-label="Clear Project Tag">Clear</Button>}</div>
    {open && <div className="max-w-full rounded-md border bg-popover p-2 shadow-md" role="dialog" aria-label="Choose Project Tag">
      <Input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKeyDown} placeholder="Search names or aliases" role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined} />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span aria-live="polite">{options.length} result{options.length === 1 ? '' : 's'}</span><button type="button" className="underline" onClick={() => setShowArchived(x => !x)}>{showArchived ? 'Hide archived' : 'Show archived'}</button></div>
      <div id={listId} role="listbox" className="mt-2 max-h-52 overflow-y-auto">
        {options.map((p, i) => { const alias = query.trim() && !p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) ? p.aliases?.find(a => a.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : undefined; return <button key={p.id} id={`${listId}-${p.id}`} type="button" role="option" aria-selected={p.id === value} className={`flex min-h-11 w-full items-center gap-2 rounded px-2 text-left text-sm ${i === active ? 'bg-accent' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => select(p.id)}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor:p.color }} /><span className="min-w-0 flex-1 break-words">{p.name}{p.status === 'archived' && ' (archived)'}{alias && <small className="block text-muted-foreground">Matched alias: {alias}</small>}</span></button>; })}
        {!options.length && <p className="p-2 text-sm text-muted-foreground">No matching Project Tags.</p>}
      </div>
      {canCreate && <Button type="button" variant="secondary" className="mt-2 w-full" onClick={startCreate}>Create Project Tag “{query.trim()}”</Button>}
    </div>}
    <Dialog open={creating} onOpenChange={setCreating}><DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm"><DialogHeader><DialogTitle>Create Project Tag</DialogTitle></DialogHeader><label className="text-sm font-medium">Name<Input value={name} onChange={e => setName(e.target.value)} autoFocus /></label><label className="text-sm font-medium">Color<Input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button><Button type="button" onClick={create}>Create and assign</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};
