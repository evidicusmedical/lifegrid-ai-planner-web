import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Plus, Clock, User, AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Link2 } from 'lucide-react';
import { TaskSheet } from '../components/TaskSheet';
import { Task, TaskPriority } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, relativeDate, isOverdue } from '../lib/format';

const STATUS_FILTERS = ['All', 'todo', 'in-progress', 'done', 'blocked'] as const;

export const TasksView = () => {
  const { tasks, categories, updateTask } = useAppData();
  const [filter, setFilter] = useState<string>('All');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const catMap = useMemo(() => {
    const m = new Map(categories.map(c => [c.id, c]));
    return m;
  }, [categories]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter !== 'All') result = result.filter(t => t.status === filter);
    if (catFilter !== 'all') result = result.filter(t => t.category === catFilter);

    const priorityWeight: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return [...result].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }, [tasks, filter, catFilter]);

  const PriorityIcon = ({ priority }: { priority: TaskPriority }) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle size={14} className="text-red-500" />;
      case 'high': return <AlertCircle size={14} className="text-orange-500" />;
      case 'medium': return <ArrowRight size={14} className="text-blue-500" />;
      case 'low': return <CheckCircle2 size={14} className="text-gray-400" />;
    }
  };

  const toggleDone = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex-none p-4 pb-2 border-b border-border bg-card">
        <h1 className="text-xl font-bold tracking-tight mb-3">Tasks</h1>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        {/* Category focus chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
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

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10">
            <CheckCircle2 className="mx-auto mb-2 opacity-20" size={48} />
            <p>No tasks found.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isExpanded = expandedId === task.id;
            const cat = catMap.get(task.category);
            const done = task.status === 'done';
            const overdue = !done && isOverdue(task.dueDate);
            return (
              <div
                key={task.id}
                className="bg-card border border-border rounded-xl p-3 shadow-sm hover:border-primary/30 transition-colors"
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
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold text-sm leading-tight ${done ? 'line-through text-muted-foreground' : ''}`}>
                        {task.name}
                      </h3>
                      <div className="shrink-0"><PriorityIcon priority={task.priority} /></div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
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
                      {task.schedulingNotes && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/80">
                          <Link2 size={11} /> has constraints
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
                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsSheetOpen(true); }}
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

      <button
        onClick={() => { setSelectedTask(null); setIsSheetOpen(true); }}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        data-testid="button-add-task"
      >
        <Plus size={24} />
      </button>

      {isSheetOpen && (
        <TaskSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} initialData={selectedTask} />
      )}
    </div>
  );
};
