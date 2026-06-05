import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppData } from '../context/AppDataContext';
import { Task, TaskPriority, TaskStatus } from '../types';

const CATEGORIES = ['work', 'personal', 'health', 'travel', 'family', 'other'];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1),
  dueDate: z.string().nullable(),
  status: z.enum(['todo', 'in-progress', 'done', 'blocked']),
  owner: z.string().min(1),
  nextAction: z.string().nullable(),
  notes: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type FormData = z.infer<typeof schema>;

interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Task | null;
}

export const TaskSheet: React.FC<TaskSheetProps> = ({ isOpen, onClose, initialData }) => {
  const { addTask, updateTask, deleteTask } = useAppData();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: 'personal',
      dueDate: '',
      status: 'todo',
      owner: 'Me',
      nextAction: '',
      notes: '',
      priority: 'medium',
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
          priority: initialData.priority,
        });
      } else {
        form.reset({
          name: '',
          category: 'personal',
          dueDate: '',
          status: 'todo',
          owner: 'Me',
          nextAction: '',
          notes: '',
          priority: 'medium',
        });
      }
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      dueDate: data.dueDate || null,
      nextAction: data.nextAction || null,
      notes: data.notes || null,
    };

    if (initialData) {
      updateTask(initialData.id, payload);
    } else {
      addTask({
        id: crypto.randomUUID(),
        ...payload,
      });
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
                  <FormControl>
                    <Input placeholder="What needs to be done?" {...field} />
                  </FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
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
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="Smallest next step..." {...field} value={field.value || ''} />
                  </FormControl>
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
                  <FormControl>
                    <Textarea placeholder="Context..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 pt-4">
              <Button type="submit" className="w-full">Save Task</Button>
              {initialData && (
                <Button type="button" variant="destructive" onClick={() => {
                  deleteTask(initialData.id);
                  onClose();
                }}>
                  Delete Task
                </Button>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
