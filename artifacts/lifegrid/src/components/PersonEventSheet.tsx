import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { PersonEvent, PersonType, TimeStatus, TimeZoneMode } from '../types';
import { X } from 'lucide-react';
import { temporalErrors } from '../lib/temporal';
import { TemporalFields } from './TemporalFields';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  person: z.string().min(1),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  color: z.string().min(1),
  notes: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

const shiftDate = (date: string, days: number): string => {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const daySpan = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1);

interface PersonEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PersonEvent | null;
  defaultPerson?: PersonType;
  onSaved?: () => void;
}

export const PersonEventSheet: React.FC<PersonEventSheetProps> = ({ isOpen, onClose, initialData, defaultPerson, onSaved }) => {
  const { addPersonEvent, updatePersonEvent, deletePersonEvent, deletePersonEventGroup, personEvents, people, activeCalendar } = useAppData();

  const [confirmDelete, setConfirmDelete] = useState<'none' | 'single' | 'group'>('none');
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [timeStatus, setTimeStatus] = useState<TimeStatus>('all-day');
  const [timeZoneMode, setTimeZoneMode] = useState<TimeZoneMode>('zoned');
  const [timeZone, setTimeZone] = useState('');
  const [temporalEndDate, setTemporalEndDate] = useState('');

  const groupId = initialData?.recurringGroupId;
  const groupSize = groupId ? personEvents.filter(pe => pe.recurringGroupId === groupId).length : 0;

  const resolvePerson = (id?: string) => people.find(p => p.id === id) ?? people[0];
  const initialPerson = resolvePerson(defaultPerson);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: new Date().toISOString().split('T')[0],
      person: initialPerson?.id ?? '',
      startTime: '',
      endTime: '',
      color: initialPerson?.color ?? '#8b5cf6',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setMultiDay(false);
      setEndDate('');
      setTimeStatus(initialData?.timeStatus ?? (initialData?.startTime ? 'timed' : 'all-day'));
      setTimeZoneMode(initialData?.timeZoneMode ?? 'zoned');
      setTimeZone(initialData?.timeZone ?? activeCalendar.displayTimeZone);
      setTemporalEndDate(initialData?.endDate ?? initialData?.date ?? '');
      if (initialData) {
        form.reset({
          title: initialData.title,
          date: initialData.date,
          person: initialData.person,
          startTime: initialData.startTime || '',
          endTime: initialData.endTime || '',
          color: initialData.color,
          notes: initialData.notes || '',
        });
      } else {
        const p = resolvePerson(defaultPerson);
        form.reset({
          title: '',
          date: new Date().toISOString().split('T')[0],
          person: p?.id ?? '',
          startTime: '',
          endTime: '',
          color: p?.color ?? '#8b5cf6',
          notes: '',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, defaultPerson]);

  const startDateVal = form.watch('date');
  const multiDayCount = multiDay && endDate && endDate >= startDateVal ? daySpan(startDateVal, endDate) : 0;

  const onSubmit = (data: FormData) => {
    const clocked = timeStatus === 'timed' || timeStatus === 'approximate';
    const base = { endDate: temporalEndDate || data.date, timeStatus, timeZone: clocked && timeZoneMode === 'zoned' ? timeZone : null, timeZoneMode: clocked ? timeZoneMode : null,
      ...data,
      startTime: clocked ? data.startTime || null : null,
      endTime: clocked ? data.endTime || null : null,
      notes: data.notes || null,
    };
    const issues = temporalErrors(base);
    if (issues.length) { form.setError('date', { message: issues[0] }); return; }

    if (initialData) {
      updatePersonEvent(initialData.id, base);
      onSaved?.();
      onClose();
      return;
    }

    if (multiDay && endDate && endDate >= data.date) {
      const gid = crypto.randomUUID();
      const days = daySpan(data.date, endDate);
      for (let i = 0; i < days; i++) {
        addPersonEvent({ id: crypto.randomUUID(), ...base, date: shiftDate(data.date, i), startTime: null, endTime: null, recurringGroupId: gid });
      }
    } else {
      addPersonEvent({ id: crypto.randomUUID(), ...base });
    }
    onClose();
  };

  const saveLabel = !initialData && multiDayCount > 1
    ? `Create ${multiDayCount} Entries`
    : initialData ? 'Save Entry' : 'Add Entry';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="mobile-sheet rounded-t-2xl overflow-hidden flex flex-col p-0 [&>button:first-of-type]:hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <h2 className="font-bold text-base">{initialData ? 'Edit Entry' : 'New Entry'}</h2>
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input placeholder="Event title" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{multiDay ? 'Start Date' : 'Date'}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Person</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const matched = people.find(p => p.id === val);
                            if (matched) form.setValue('color', matched.color);
                          }}
                          value={field.value}
                        >
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {people.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                  {p.label}
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

                {/* Multi-day (new entries only) */}
                {!initialData && (
                  <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Multi-day event</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Conference, trip, away period…</p>
                      </div>
                      <Switch checked={multiDay} onCheckedChange={setMultiDay} data-testid="switch-multiday-person" />
                    </div>
                    {multiDay && (
                      <div className="space-y-2 animate-in fade-in">
                        <div>
                          <Label className="text-xs text-muted-foreground">End Date</Label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            min={startDateVal}
                            className="h-9 text-sm mt-1"
                            data-testid="input-end-date-person"
                          />
                        </div>
                        {multiDayCount > 0 && (
                          <p className="text-xs text-primary font-semibold">
                            Will create {multiDayCount} entr{multiDayCount !== 1 ? 'ies' : 'y'} — one per day
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!multiDay && <TemporalFields prefix="person-schedule" date={startDateVal} startTime={form.watch('startTime') || ''} endTime={form.watch('endTime') || ''} endDate={temporalEndDate} timeStatus={timeStatus} timeZoneMode={timeZoneMode} timeZone={timeZone} displayTimeZone={activeCalendar.displayTimeZone} onChange={next => { if (next.startTime !== undefined) form.setValue('startTime', next.startTime); if (next.endTime !== undefined) form.setValue('endTime', next.endTime); if (next.endDate !== undefined) setTemporalEndDate(next.endDate); if (next.timeStatus !== undefined) setTimeStatus(next.timeStatus); if (next.timeZoneMode !== undefined) setTimeZoneMode(next.timeZoneMode); if (next.timeZone !== undefined) setTimeZone(next.timeZone); }} />}

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl><Input type="color" className="w-full h-10 p-1" {...field} /></FormControl>
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
                          Delete this entry only
                        </Button>
                        <Button type="button" variant="destructive" className="w-full h-10" onClick={() => setConfirmDelete('group')}>
                          Delete all {groupSize} in series
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="destructive" className="w-full h-10" onClick={() => setConfirmDelete('single')}>
                        Delete Entry
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
              {confirmDelete === 'group' ? `Delete all ${groupSize} entries in this series?` : `Delete "${initialData?.title}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === 'group'
                ? `This removes all ${groupSize} entries in this series. This can't be undone.`
                : "This permanently removes the entry. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete('none')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete === 'group' && groupId) {
                  deletePersonEventGroup(groupId);
                } else if (initialData) {
                  deletePersonEvent(initialData.id);
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
