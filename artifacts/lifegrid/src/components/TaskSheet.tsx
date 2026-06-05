import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppData } from '../context/AppDataContext';
import { Task } from '../types';

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
});

type FormData = z.infer<typeof schema>;

interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Task | null;
}

export const TaskSheet: React.FC<TaskSheetProps> = ({ isOpen, onClose, initialData }) => {
  const { addTask, updateTask, deleteTask, categories } = useAppData();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const defaultCat = categories.find(c => c.id === 'personal')?.id ?? categories[0]?.id ?? 'personal';

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', category: defaultCat, dueDate: '', status: 'todo',
      owner: 'Me', nextAction: '', notes: '', schedulingNotes: '', priority: 'medium',
    },
  });

  useEffect(() => {
    if (isOpen) {
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
        });
      } else {
        form.reset({
          name: '', category: defaultCat, dueDate: '', status: 'todo',
          owner: 'Me', nextAction: '', notes: '', schedulingNotes: '', priority: 'medium',
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
    };
    if (initialData) {
      updateTask(initialData.id, payload);
    } else {
      addTask({ id: crypto.randomUUID(), ...payload });
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:mx-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:h-auto sm:max-h-[90vh]">
        <SheetHeader>
          <SheetTitle>{initialData ? 'Edit Task' : 'Add Task'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 pb-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl><Input placeholder="What needs to be done?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
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
                      placeholder="e.g. needs 2 hrs focus, must be before the trip, depends on permits, can only be done on a day off..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Constraints &amp; dependencies the AI uses when suggesting when to schedule this.
                  </FormDescription>
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

            <div className="flex flex-col gap-2 pt-4">
              <Button type="submit" className="w-full">Save Task</Button>
              {initialData && (
                <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive">Delete Task</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{initialData.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the task from this calendar. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => { deleteTask(initialData.id); setConfirmDelete(false); onClose(); }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
