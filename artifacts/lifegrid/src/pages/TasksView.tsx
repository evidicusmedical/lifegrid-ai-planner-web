import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import {
  Plus, Clock, User, AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Link2,
  ArrowDownUp, ChevronDown,
} from 'lucide-react';
import { TaskSheet } from '../components/TaskSheet';
import { Task, TaskPriority } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, relativeDate, isOverdue } from '../lib/format';

// ─── Sort and filter contracts ───────────────────────────────────────────────
import { TASK_SORT_DESCRIPTIONS, TASK_SORT_LABELS, type TaskSortMode, type TaskStatusFilter, filterTasksByStatus, sortTasks } from '../lib/taskWorkflow';

type FilterMode =
  | 'all' | 'incomplete' | 'overdue' | 'today' | 'this-week'
  | 'high-priority' | 'no-due-date';

const FILTER_CHIPS: { id: FilterMode; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'incomplete', label: 'Incomplete' },
  { id: 'overdue', label: 'Overdue' }, { id: 'today', label: 'Due today' },
  { id: 'this-week', label: 'This week' }, { id: 'high-priority', label: 'High priority' },
  { id: 'no-due-date', label: 'No due date' },
];

const todayStr = () => new Date().toISOString().split('T')[0];
const addDaysStr = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
function applyFilter(tasks: Task[], filter: FilterMode): Task[] {
  const today = todayStr(), inWeek = addDaysStr(7);
  switch (filter) {
    case 'incomplete': return tasks.filter(t => t.status !== 'done');
    case 'overdue': return tasks.filter(t => t.status !== 'done' && !!t.dueDate && t.dueDate < today);
    case 'today': return tasks.filter(t => t.dueDate === today);
    case 'this-week': return tasks.filter(t => !!t.dueDate && t.dueDate >= today && t.dueDate <= inWeek);
    case 'high-priority': return tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
    case 'no-due-date': return tasks.filter(t => !t.dueDate);
    default: return tasks;
  }
}

const STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

const STATUS_BADGE_CLASS: Record<Task['status'], string> = {
  todo: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  'in-progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  blocked: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  done: 'bg-green-500/10 text-green-700 dark:text-green-400',
};


const DUE_DATE_TYPE_LABELS: Record<string, string> = {
  'real-deadline': 'Real deadline',
  'target-date': 'Target date',
  'someday-backlog': 'Someday',
  'needs-clarification': 'Clarify date',
  'project-subtask': 'Project subtask',
};

const TRIAGE_STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  'needs-review': 'Needs review',
  blocked: 'Blocked',
  waiting: 'Waiting',
  'duplicate-candidate': 'Possible duplicate',
  'needs-scheduling': 'Needs scheduling',
  scheduled: 'Scheduled',
  backlog: 'Backlog',
};

const PriorityIcon = ({ priority }: { priority: TaskPriority }) => {
  switch (priority) {
    case 'urgent': return <AlertTriangle size={14} className="text-red-500" />;
    case 'high': return <AlertCircle size={14} className="text-orange-500" />;
    case 'medium': return <ArrowRight size={14} className="text-blue-500" />;
    case 'low': return <CheckCircle2 size={14} className="text-gray-400" />;
  }
};

// ─── Main component ───────────────────────────────────────────────────────────
export const TasksView = () => {
  const { tasks, categories, projects, updateTask } = useAppData();

  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<TaskSortMode>(() => { try { const saved = localStorage.getItem('lifegrid_task_sort'); return saved && saved in TASK_SORT_LABELS ? saved as TaskSortMode : 'smart'; } catch { return 'smart'; } });
  const [catFilter, setCatFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  // Project progress: { [projectId]: { total, done } }
  const projectProgress = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    tasks.forEach(t => {
      if (!t.projectId) return;
      const s = m.get(t.projectId) ?? { total: 0, done: 0 };
      s.total++;
      if (t.status === 'done') s.done++;
      m.set(t.projectId, s);
    });
    return m;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    result = applyFilter(result, filter);
    result = filterTasksByStatus(result, statusFilter);
    if (catFilter !== 'all') result = result.filter(t => t.category === catFilter);
    if (projectFilter !== 'all') result = result.filter(t => t.projectId === projectFilter);
    return sortTasks(result, sort, categories, todayStr());
  }, [tasks, filter, statusFilter, sort, catFilter, projectFilter, categories]);

  const toggleDone = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  const openEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsSheetOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* ── Header ── */}
      <div className="flex-none p-4 pb-2 border-b border-border bg-card">
        <div className="task-heading mb-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Use tasks for small next actions; group larger efforts with projects and tags.</p>
          </div>
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label={`Sort: ${TASK_SORT_LABELS[sort]}`} className="task-sort-control flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
                <ArrowDownUp size={12} />
                {TASK_SORT_LABELS[sort]}
                <ChevronDown size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-[10px]">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.entries(TASK_SORT_LABELS) as [TaskSortMode, string][]).map(([id, label]) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => { setSort(id); try { localStorage.setItem('lifegrid_task_sort', id); } catch { /* optional preference */ } }}
                  className={`text-xs ${sort === id ? 'font-semibold text-primary' : ''}`}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground" data-testid="task-sort-description">{TASK_SORT_DESCRIPTIONS[sort]}</p>

        {/* Filter chips */}
        <div className="task-chip-rail flex gap-2 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide -mx-4 px-4">
          {FILTER_CHIPS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-2" role="radiogroup" aria-label="Task status"><p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Status</p><div className="task-chip-rail flex gap-2 overflow-x-auto">{([['all','All statuses'],['todo','To do'],['in-progress','In progress'],['blocked','Blocked'],['done','Done']] as [TaskStatusFilter,string][]).map(([id,label]) => <button key={id} type="button" role="radio" aria-checked={statusFilter === id} data-testid={`task-status-${id}`} onClick={() => setStatusFilter(id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${statusFilter === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{label}</button>)}</div></div>

        {/* Project filter (only if projects exist) */}
        {projects.length > 0 && (
          <div className="task-chip-rail flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setProjectFilter('all')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                projectFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted/60 text-muted-foreground'
              }`}
            >
              All projects
            </button>
            {projects.map(p => {
              const prog = projectProgress.get(p.id);
              const on = projectFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setProjectFilter(on ? 'all' : p.id)}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    on ? 'text-white' : 'bg-muted/60 text-muted-foreground'
                  }`}
                  style={on ? { backgroundColor: p.color } : undefined}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                  {prog && (
                    <span className={`ml-0.5 ${on ? 'text-white/70' : 'text-muted-foreground/60'}`}>
                      {prog.done}/{prog.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Category focus chips */}
        <div className="task-chip-rail flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setCatFilter('all')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
              catFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted/60 text-muted-foreground'
            }`}
          >
            All tags
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                catFilter === c.id ? 'text-white' : 'bg-muted/60 text-muted-foreground'
              }`}
              style={catFilter === c.id ? { backgroundColor: c.color } : undefined}
              data-testid={`task-cat-${c.id}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Task list ── */}
      <div className="task-list flex-1 overflow-y-auto p-4 space-y-3">
        {/* Project progress header when filtered */}
        {projectFilter !== 'all' && (() => {
          const proj = projectMap.get(projectFilter);
          const prog = projectProgress.get(projectFilter);
          if (!proj || !prog) return null;
          const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
          return (
            <div className="rounded-xl border border-border bg-card p-3 mb-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }} />
                  <span className="text-sm font-bold">{proj.name}</span>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">{prog.done} of {prog.total} done</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: proj.color }}
                />
              </div>
            </div>
          );
        })()}

        {filteredTasks.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10">
            <CheckCircle2 className="mx-auto mb-2 opacity-20" size={48} />
            <p>No tasks match this filter.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isExpanded = expandedId === task.id;
            const cat = catMap.get(task.category);
            const proj = task.projectId ? projectMap.get(task.projectId) : null;
            const done = task.status === 'done';
            const blocked = task.status === 'blocked';
            const overdue = !done && isOverdue(task.dueDate);

            return (
              <div
                key={task.id}
                className={`bg-card border border-border rounded-xl p-3 shadow-sm hover:border-primary/30 transition-colors ${blocked ? 'opacity-60' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Quick mark-done */}
                  <button
                    onClick={(e) => toggleDone(task, e)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      done ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40 hover:border-primary'
                    }`}
                    data-testid={`task-done-${task.id}`}
                    title={done ? 'Mark as to-do' : 'Mark as done'}
                  >
                    {done && <CheckCircle2 size={14} className="text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="task-card-title-row flex items-start gap-2">
                      <h3 className={`min-w-0 flex-1 break-words font-semibold text-sm leading-tight ${done ? 'line-through text-muted-foreground' : ''}`}>
                        {task.name}
                      </h3>
                      <div className="shrink-0 flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE_CLASS[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        <PriorityIcon priority={task.priority} />
                      </div>
                    </div>

                    {/* Project pill */}
                    {proj && (
                      <div className="mt-1">
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${proj.color}22`, color: proj.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                          {proj.name}
                        </span>
                      </div>
                    )}

                    <div className="task-card-metadata flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {task.dueDate && (
                        <div className={`flex items-center gap-1 font-medium ${overdue ? 'text-red-500' : ''}`}>
                          <Clock size={12} />
                          {formatDate(task.dueDate, { weekday: false })}
                          <span className="opacity-70">· {relativeDate(task.dueDate)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        {task.owner}
                      </div>
                      {cat && (
                        <Badge variant="secondary" className="text-[9px]" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                          {cat.label}
                        </Badge>
                      )}
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground/80">{task.priority}</span>
                      {task.schedulingNotes && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/80 font-semibold">
                          <Link2 size={11} /> constraints
                        </span>
                      )}
                      {task.dueDateType && task.dueDateType !== 'target-date' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          {DUE_DATE_TYPE_LABELS[task.dueDateType] ?? task.dueDateType}
                        </span>
                      )}
                      {task.triageStatus && task.triageStatus !== 'ready' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          {TRIAGE_STATUS_LABELS[task.triageStatus] ?? task.triageStatus}
                        </span>
                      )}
                      {task.linkedEventIds?.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/80 font-semibold">
                          <Link2 size={11} /> {task.linkedEventIds.length} event{task.linkedEventIds.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2 space-y-2">
                        {task.nextAction && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Next Action</span>
                            <p className="text-sm bg-muted/40 p-2 rounded-md border border-border/50">{task.nextAction}</p>
                          </div>
                        )}
                        {task.schedulingNotes && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Scheduling &amp; Dependencies</span>
                            <p className="text-sm bg-primary/5 p-2 rounded-md border border-primary/20 whitespace-pre-wrap">{task.schedulingNotes}</p>
                          </div>
                        )}
                        {task.notes && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Notes</span>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
                          </div>
                        )}
                        <div className="flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => openEdit(task, e)}
                          >
                            Edit Task
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setSelectedTask(null); setIsSheetOpen(true); }}
        aria-label="Add task"
        className="task-fab absolute right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        data-testid="button-add-task"
      >
        <Plus size={24} /><span className="sr-only">Add task</span>
      </button>

      {isSheetOpen && (
        <TaskSheet isOpen={isSheetOpen} onClose={() => { setIsSheetOpen(false); setSelectedTask(null); }} initialData={selectedTask} />
      )}
    </div>
  );
};
