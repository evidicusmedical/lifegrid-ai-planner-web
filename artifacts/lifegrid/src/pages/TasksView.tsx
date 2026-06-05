import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Plus, Clock, User, AlertCircle, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TaskSheet } from '../components/TaskSheet';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_FILTERS = ['All', 'todo', 'in-progress', 'done', 'blocked'] as const;

export const TasksView = () => {
  const { tasks } = useAppData();
  const [filter, setFilter] = useState<string>('All');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter !== 'All') {
      result = result.filter(t => t.status === filter);
    }
    
    // Sort by priority: urgent > high > medium > low
    const priorityWeight: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return result.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  }, [tasks, filter]);

  const PriorityIcon = ({ priority }: { priority: TaskPriority }) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle size={14} className="text-red-500" />;
      case 'high': return <AlertCircle size={14} className="text-orange-500" />;
      case 'medium': return <ArrowRight size={14} className="text-blue-500" />;
      case 'low': return <CheckCircle2 size={14} className="text-gray-400" />;
    }
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
            return (
              <div 
                key={task.id} 
                className="bg-card border border-border rounded-xl p-3 shadow-sm hover:border-primary/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <PriorityIcon priority={task.priority} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold text-sm leading-tight ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.name}
                      </h3>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0">
                        {task.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-red-500/80 font-medium">
                          <Clock size={12} />
                          {task.dueDate}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        {task.owner}
                      </div>
                      <Badge variant="secondary" className="text-[9px] bg-secondary/50">
                        {task.category}
                      </Badge>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                        {task.nextAction && (
                          <div className="mb-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Next Action</span>
                            <p className="text-sm bg-muted/40 p-2 rounded-md border border-border/50">{task.nextAction}</p>
                          </div>
                        )}
                        {task.notes && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Notes</span>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
                          </div>
                        )}
                        <div className="mt-3 flex justify-end">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setIsSheetOpen(true);
                            }}
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
        onClick={() => {
          setSelectedTask(null);
          setIsSheetOpen(true);
        }}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>

      {isSheetOpen && (
        <TaskSheet 
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          initialData={selectedTask}
        />
      )}
    </div>
  );
};
