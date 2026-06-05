import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  category: z.string().min(1),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  color: z.string().min(1),
  notes: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface EventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Event | null;
  defaultDate?: string;
}

export const EventSheet: React.FC<EventSheetProps> = ({ isOpen, onClose, initialData, defaultDate }) => {
  const { addEvent, updateEvent, deleteEvent, categories } = useAppData();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const firstCat = categories[0];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      category: firstCat?.id ?? 'work',
      startTime: '',
      endTime: '',
      color: firstCat?.color ?? '#2563eb',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          title: initialData.title,
          date: initialData.date,
          category: initialData.category,
          startTime: initialData.startTime || '',
          endTime: initialData.endTime || '',
          color: initialData.color,
          notes: initialData.notes || '',
        });
      } else {
        form.reset({
          title: '',
          date: defaultDate || new Date().toISOString().split('T')[0],
          category: firstCat?.id ?? 'work',
          startTime: '',
          endTime: '',
          color: firstCat?.color ?? '#2563eb',
          notes: '',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, defaultDate]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      notes: data.notes || null,
    };
    if (initialData) {
      updateEvent(initialData.id, payload);
    } else {
      addEvent({ id: crypto.randomUUID(), ...payload });
    }
    onClose();
  };

  const presetColors = categories.map(c => c.color);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:mx-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:h-auto sm:max-h-[90vh]">
        <SheetHeader>
          <SheetTitle>{initialData ? 'Edit Event' : 'Add Event'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 pb-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="Event title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
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
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        const matched = categories.find(c => c.id === val);
                        if (matched) form.setValue('color', matched.color);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      </FormControl>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 flex-wrap">
                      {presetColors.map((color, i) => (
                        <button
                          key={`${color}-${i}`}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${field.value === color ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                      <Input type="color" className="w-10 h-10 p-0 border-0 ml-auto" {...field} />
                    </div>
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
                  <FormControl><Textarea placeholder="Optional details..." {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 pt-4">
              <Button type="submit" className="w-full">Save Event</Button>
              {initialData && (
                <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive">Delete Event</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{initialData.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the event from this calendar. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => { deleteEvent(initialData.id); setConfirmDelete(false); onClose(); }}
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
