import React, { useMemo } from 'react';
import { FolderOpen, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '../context/AppDataContext';

/** A deliberately lightweight route: project editing remains in Settings, while this
 * route makes project progress and ordering practical without a wide table. */
export const ProjectsView = () => {
  const { projects, tasks, reorderProjects } = useAppData();
  const ordered = useMemo(() => [...projects].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)), [projects]);
  return <section className="mobile-scroll min-w-0 flex-1 overflow-y-auto p-3 sm:p-5" data-testid="projects-mobile-view">
    <header className="mb-3"><h1 className="text-lg font-bold">Projects</h1><p className="text-sm text-muted-foreground">Progress and saved order for this calendar.</p></header>
    <div className="grid gap-3 sm:grid-cols-2">
      {ordered.map((project, index) => {
        const projectTasks = tasks.filter(task => task.projectId === project.id);
        const complete = projectTasks.filter(task => task.status === 'done').length;
        const percent = projectTasks.length ? Math.round((complete / projectTasks.length) * 100) : 0;
        return <article key={project.id} className="min-w-0 rounded-xl border bg-card p-3" data-testid={`project-card-${project.id}`}>
          <div className="flex min-w-0 items-start gap-2"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} /><div className="min-w-0 flex-1"><h2 className="wrap-anywhere font-semibold">{project.name}</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{project.status} · {complete}/{projectTasks.length} complete</p></div></div>
          <div className="mt-3 h-2 overflow-hidden rounded bg-muted" aria-label={`${percent}% complete`}><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div>
          <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="min-h-11 flex-1" disabled={index === 0} onClick={() => reorderProjects(index, index - 1)} aria-label={`Move ${project.name} up`}><ArrowUp size={16} /> Move up</Button><Button size="sm" variant="outline" className="min-h-11 flex-1" disabled={index === ordered.length - 1} onClick={() => reorderProjects(index, index + 1)} aria-label={`Move ${project.name} down`}><ArrowDown size={16} /> Move down</Button></div>
        </article>;
      })}
      {!ordered.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><FolderOpen className="mx-auto mb-2" />No projects in this calendar. Create and edit projects in Settings.</div>}
    </div>
  </section>;
};
