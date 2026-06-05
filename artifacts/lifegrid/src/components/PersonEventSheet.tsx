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
import { PersonEvent, PersonType } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  person: z.enum(['wife', 'shared']),
  color: z.string().min(1),
  notes: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface PersonEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PersonEvent | null;
  defaultPerson?: PersonType;
}

export const PersonEventSheet: React.FC<PersonEventSheetProps> = ({ isOpen, onClose, initialData, defaultPerson }) => {
  const { addPersonEvent, updatePersonEvent, deletePersonEvent } = useAppData();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: new Date().toISOString().split('T')[0],
      person: defaultPerson || 'wife',
      color: defaultPerson === 'wife' ? '#8b5cf6' : '#ef4444',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          title: initialData.title,
          date: initialData.date,
          person: initialData.person,
          color: initialData.color,
          notes: initialData.notes || '',
        });
      } else {
        form.reset({
          title: '',
          date: new Date().toISOString().split('T')[0],
          person: defaultPerson || 'wife',
          color: defaultPerson === 'wife' ? '#8b5cf6' : '#ef4444',
          notes: '',
        });
      }
    }
  }, [isOpen, initialData, defaultPerson, form]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      notes: data.notes || null,
    };

    if (initialData) {
      updatePersonEvent(initialData.id, payload);
    } else {
      addPersonEvent({
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
          <SheetTitle>{initialData ? 'Edit Entry' : 'Add Entry'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 pb-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
                  </FormControl>
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData || !!defaultPerson}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="wife">Wife's Schedule</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input type="color" className="w-full h-10 p-1" {...field} />
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
              <Button type="submit" className="w-full">Save Entry</Button>
              {initialData && (
                <Button type="button" variant="destructive" onClick={() => {
                  deletePersonEvent(initialData.id);
                  onClose();
                }}>
                  Delete Entry
                </Button>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
