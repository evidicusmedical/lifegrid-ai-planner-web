import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppData } from '../context/AppDataContext';
import { Task, TaskDueDateType, TaskTriageStatus } from '../types';
import { X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1),
  dueDate: z.string().nullable(),
  status: z.enum(['todo', 'in-progress', 'done', 'blocked']),
  owner: z.string().min(1),
  nextAction: z.string().nullable(),
  notes: z.string().nullable(),
  schedulingNotes: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  projectId: z.string().nullable().optional(),
  dueDateType: z.enum(['real-deadline', 'target-date', 'someday-backlog', 'needs-clarification', 'project-subtask']),
  triageStatus: z.enum(['ready', 'needs-review', 'blocked', 'waiting', 'duplicate-candidate', 'needs-scheduling', 'scheduled', 'backlog']),
  parentTaskId: z.string().nullable(),
  linkedEventIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;


const DUE_DATE_TYPE_OPTIONS: { value: TaskDueDateType; label: string }[] = [
  { value: 'real-deadline', label: 'Real deadline' },
  { value: 'target-date', label: 'Target date' },
  { value: 'someday-backlog', label: 'Someday / backlog' },
  { value: 'needs-clarification', label: 'Needs clarification' },
  { value: 'project-subtask', label: 'Project subtask' },
];

const TRIAGE_STATUS_OPTIONS: { value: TaskTriageStatus; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'duplicate-candidate', label: 'Duplicate candidate' },
  { value: 'needs-scheduling', label: 'Needs scheduling' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'backlog', label: 'Backlog' },
];

const shiftDate = (date: string, days: number): string => {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const shiftByFreq = (date: string, freq: string, n: number): string => {
  if (freq === 'daily') return shiftDate(date, n);
  if (freq === 'weekly') return shiftDate(date, n * 7);
  if (freq === 'biweekly') return shiftDate(date, n * 14);
  const d = new Date(date + 'T00:00:00');
  if (freq === 'yearly') {
    d.setFullYear(d.getFullYear() + n);
    return d.toISOString().split('T')[0];
  }
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
};

interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Task | null;
}

export const TaskSheet: React.FC<TaskSheetProps> = ({ isOpen, onClose, initialData }) => {
  const { addTask, updateTask, deleteTask, deleteTaskGroup, tasks, categories, projects } = useAppData();

  const [confirmDelete, setConfirmDelete] = useState<'none' | 'single' | 'group'>('none');
  const [repeat, setRepeat] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('weekly');
  const [repeatCount, setRepeatCount] = useState(4);

  const groupId = initialData?.recurringGroupId;
  const groupSize = groupId ? tasks.filter(t => t.recurringGroupId === groupId).length : 0;

  const defaultCat = categories.find(c => c.id === 'personal')?.id ?? categories[0]?.id ?? 'personal';

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', category: defaultCat, dueDate: '', status: 'todo',
      owner: 'Me', nextAction: '', notes: '', schedulingNotes: '', priority: 'medium',
      projectId: null, dueDateType: 'someday-backlog', triageStatus: 'backlog', parentTaskId: null, linkedEventIds: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      setRepeat(false);
      setRepeatFreq('weekly');
      setRepeatCount(4);
      if (initialData) {
        form.reset({
          name: initialData.name,
          category: initialData.category,
          dueDate: initialData.dueDate || '',
          status: initialData.status,
          owner: initialData.owner,
          nextAction: initialData.nextAction || '',
          notes: initialData.notes || '',
          schedulingNotes: initialData.schedulingNotes || '',
          priority: initialData.priority,
          projectId: initialData.projectId ?? null,
          dueDateType: initialData.dueDateType ?? (initialData.dueDate ? (initialData.projectId ? 'project-subtask' : 'target-date') : 'someday-backlog'),
          triageStatus: initialData.triageStatus ?? (initialData.status === 'blocked' ? 'blocked' : initialData.status === 'done' ? 'backlog' : initialData.dueDate ? 'ready' : 'backlog'),
          parentTaskId: initialData.parentTaskId ?? null,
          linkedEventIds: initialData.linkedEventIds ?? [],
        });
      } else {
        form.reset({
          name: '', category: defaultCat, dueDate: '', status: 'todo',
          owner: 'Me', nextAction: '', notes: '', schedulingNotes: '', priority: 'medium',
          projectId: null, dueDateType: 'someday-backlog', triageStatus: 'backlog', parentTaskId: null, linkedEventIds: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      dueDate: data.dueDate || null,
      nextAction: data.nextAction || null,
      notes: data.notes || null,
      schedulingNotes: data.schedulingNotes || null,
      projectId: data.projectId || null,
      parentTaskId: data.parentTaskId || null,
      linkedEventIds: data.linkedEventIds ?? [],
    };

    if (initialData) {
      updateTask(initialData.id, payload);
      onClose();
      return;
    }

    if (repeat && repeatCount > 1 && payload.dueDate) {
      const gid = crypto.randomUUID();
      for (let i = 0; i < repeatCount; i++) {
        addTask({
          id: crypto.randomUUID(),
          ...payload,
          dueDate: shiftByFreq(payload.dueDate, repeatFreq, i),
          recurringGroupId: gid,
        });
      }
    } else {
      addTask({ id: crypto.randomUUID(), ...payload });
    }
    onClose();
  };

  const saveLabel = !initialData && repeat && repeatCount > 1
    ? `Create ${repeatCount} Tasks`
    : initialData ? 'Save Task' : 'Add Task';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="mobile-sheet rounded-t-2xl overflow-hidden flex flex-col p-0 [&>button:first-of-type]:hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <h2 className="font-bold text-base">{initialData ? 'Edit Task' : 'New Task'}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Close"
              data-testid="button-sheet-close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-4 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>
                      <FormControl><Input placeholder="Small, concrete action (e.g. Call dentist)" {...field} /></FormControl>
                      <FormDescription>Keep tasks small and actionable. Use Projects/Tags for large efforts.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{repeat ? 'First Due Date' : 'Due Date'}</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Project / parent */}
                {projects.length > 0 && (
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project / major event (optional)</FormLabel>
                        <Select
                          onValueChange={v => field.onChange(v === '__none__' ? null : v)}
                          value={field.value ?? '__none__'}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No project</SelectItem>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                  {p.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Group related subtasks under a project; focus mode in Tasks helps work through them.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Advanced planning */}
                <details className="rounded-xl border border-border bg-muted/20 p-3 group">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-foreground flex items-center justify-between">
                    Advanced planning
                    <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
                  </summary>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <FormField
                      control={form.control}
                      name="dueDateType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due date type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {DUE_DATE_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormDescription>Classifies whether this date is fixed, flexible, or backlog.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="triageStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Triage status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {TRIAGE_STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormDescription>Helps AI and review workflows sort what needs attention.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </details>

                {/* Repeat (new tasks only) */}
                {!initialData && (
                  <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Repeat</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Create multiple occurrences at once</p>
                      </div>
                      <Switch checked={repeat} onCheckedChange={setRepeat} data-testid="switch-repeat-task" />
                    </div>
                    {repeat && (
                      <div className="space-y-3 animate-in fade-in">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Frequency</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as const).map(f => (
                              <button
                                key={f}
                                type="button"
                                onClick={() => setRepeatFreq(f)}
                                className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                                  repeatFreq === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                                }`}
                              >
                                {f === 'biweekly' ? 'Bi-weekly' : f.charAt(0).toUpperCase() + f.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">How many?</Label>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setRepeatCount(c => Math.max(2, c - 1))} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:bg-muted transition-colors">−</button>
                            <span className="text-xl font-bold w-10 text-center">{repeatCount}</span>
                            <button type="button" onClick={() => setRepeatCount(c => Math.min(52, c + 1))} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:bg-muted transition-colors">+</button>
                            <span className="text-xs text-muted-foreground">tasks</span>
                          </div>
                          <p className="text-xs text-primary font-semibold mt-1.5">Will create {repeatCount} tasks ({repeatFreq})</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action</FormLabel>
                      <FormControl><Input placeholder="Smallest next step..." {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schedulingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduling Notes &amp; Dependencies</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. needs 2 hrs focus, must be before the trip, depends on permits..."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>Constraints the AI uses when suggesting when to schedule this.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea placeholder="Context..." {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2 pt-2 pb-2">
                  <Button type="submit" className="w-full h-11">{saveLabel}</Button>

                  {initialData && (
                    groupId && groupSize > 1 ? (
                      <>
                        <Button type="button" variant="outline" className="w-full h-10 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setConfirmDelete('single')}>
                          Delete this task only
                        </Button>
                        <Button type="button" variant="destructive" className="w-full h-10" onClick={() => setConfirmDelete('group')}>
                          Delete all {groupSize} in series
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="destructive" className="w-full h-10" onClick={() => setConfirmDelete('single')}>
                        Delete Task
                      </Button>
                    )
                  )}
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete !== 'none'} onOpenChange={open => !open && setConfirmDelete('none')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete === 'group' ? `Delete all ${groupSize} tasks in this series?` : `Delete "${initialData?.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === 'group'
                ? `This removes all ${groupSize} recurring tasks in this series. This can't be undone.`
                : "This permanently removes the task. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete('none')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete === 'group' && groupId) {
                  deleteTaskGroup(groupId);
                } else if (initialData) {
                  deleteTask(initialData.id);
                }
                setConfirmDelete('none');
                onClose();
              }}
            >
              {confirmDelete === 'group' ? 'Delete All' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
