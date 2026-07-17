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
import { Event, EventDisplayPriority, TimeStatus, TimeZoneMode } from '../types';
import { temporalErrors } from '../lib/temporal';
import { X } from 'lucide-react';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  category: z.string().min(1),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  color: z.string().min(1),
  notes: z.string().nullable(),
  displayPriority: z.coerce.number().refine(v => [1, 2, 3, 4, 5].includes(v), 'Choose a priority') as z.ZodType<EventDisplayPriority>,
  showInGrid: z.boolean(),
  showInExport: z.boolean(),
  linkedTaskIds: z.array(z.string()),
  aiNotes: z.string().nullable(),
  sourceNotes: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;


const DISPLAY_PRIORITY_OPTIONS: { value: EventDisplayPriority; label: string }[] = [
  { value: 1, label: '1 · Day-defining item' },
  { value: 2, label: '2 · Fixed commitment' },
  { value: 3, label: '3 · Important planning block' },
  { value: 4, label: '4 · Flexible item' },
  { value: 5, label: '5 · Reference / informational' },
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

const daySpan = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1);

interface EventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Event | null;
  defaultDate?: string;
}

export const EventSheet: React.FC<EventSheetProps> = ({ isOpen, onClose, initialData, defaultDate }) => {
  const { addEvent, updateEvent, deleteEvent, deleteEventGroup, events, categories, activeCalendar } = useAppData();

  const [confirmDelete, setConfirmDelete] = useState<'none' | 'single' | 'group'>('none');
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('weekly');
  const [repeatCount, setRepeatCount] = useState(4);
  const [timeStatus, setTimeStatus] = useState<TimeStatus>('all-day');
  const [timeZoneMode, setTimeZoneMode] = useState<TimeZoneMode>('zoned');
  const [timeZone, setTimeZone] = useState(activeCalendar.displayTimeZone);
  const [temporalEndDate, setTemporalEndDate] = useState('');

  const groupId = initialData?.recurringGroupId;
  const groupSize = groupId ? events.filter(e => e.recurringGroupId === groupId).length : 0;

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
      displayPriority: 4,
      showInGrid: true,
      showInExport: true,
      linkedTaskIds: [],
      aiNotes: '',
      sourceNotes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setMultiDay(false);
      setEndDate('');
      setRepeat(false);
      setRepeatFreq('weekly');
      setRepeatCount(4);
      setTimeStatus(initialData?.timeStatus ?? (initialData?.startTime ? 'timed' : 'all-day'));
      setTimeZoneMode(initialData?.timeZoneMode ?? 'zoned');
      setTimeZone(initialData?.timeZone ?? activeCalendar.displayTimeZone);
      setTemporalEndDate(initialData?.endDate ?? initialData?.date ?? defaultDate ?? '');
      if (initialData) {
        form.reset({
          title: initialData.title,
          date: initialData.date,
          category: initialData.category,
          startTime: initialData.startTime || '',
          endTime: initialData.endTime || '',
          color: initialData.color,
          notes: initialData.notes || '',
          displayPriority: initialData.displayPriority ?? (initialData.startTime ? 2 : 4),
          showInGrid: initialData.showInGrid ?? true,
          showInExport: initialData.showInExport ?? true,
          linkedTaskIds: initialData.linkedTaskIds ?? [],
          aiNotes: initialData.aiNotes || '',
          sourceNotes: initialData.sourceNotes || '',
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
          displayPriority: 4,
          showInGrid: true,
          showInExport: true,
          linkedTaskIds: [],
          aiNotes: '',
          sourceNotes: '',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, defaultDate]);

  const startDateVal = form.watch('date');

  const onSubmit = (data: FormData) => {
    const clocked = timeStatus === 'timed' || timeStatus === 'approximate';
    const base = {
      ...data,
      endDate: temporalEndDate || data.date,
      timeStatus,
      startTime: clocked ? (data.startTime || null) : null,
      endTime: clocked ? (data.endTime || null) : null,
      timeZone: clocked && timeZoneMode === 'zoned' ? timeZone : null,
      timeZoneMode: clocked ? timeZoneMode : null,
      notes: data.notes || null,
      displayPriority: data.displayPriority,
      showInGrid: data.showInGrid,
      showInExport: data.showInExport,
      linkedTaskIds: data.linkedTaskIds ?? [],
      aiNotes: data.aiNotes || null,
      sourceNotes: data.sourceNotes || null,
    };

    const issues = temporalErrors(base);
    if (issues.length) { form.setError('date', { message: issues[0] }); return; }
    if (initialData) {
      updateEvent(initialData.id, base);
      onClose();
      return;
    }

    if (multiDay && endDate && endDate >= data.date) {
      const gid = crypto.randomUUID();
      const days = daySpan(data.date, endDate);
      for (let i = 0; i < days; i++) {
        addEvent({ id: crypto.randomUUID(), ...base, date: shiftDate(data.date, i), startTime: null, endTime: null, recurringGroupId: gid });
      }
    } else if (repeat && repeatCount > 1) {
      const gid = crypto.randomUUID();
      for (let i = 0; i < repeatCount; i++) {
        addEvent({ id: crypto.randomUUID(), ...base, date: shiftByFreq(data.date, repeatFreq, i), recurringGroupId: gid });
      }
    } else {
      addEvent({ id: crypto.randomUUID(), ...base });
    }
    onClose();
  };

  const presetColors = categories.map(c => c.color);

  const multiDayCount = multiDay && endDate && endDate >= startDateVal ? daySpan(startDateVal, endDate) : 0;
  const saveLabel = initialData
    ? 'Save Event'
    : multiDayCount > 1
    ? `Create ${multiDayCount} Events`
    : repeat && repeatCount > 1
    ? `Create ${repeatCount} Events`
    : 'Save Event';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl overflow-hidden flex flex-col p-0 [&>button:first-of-type]:hidden"
          style={{ height: '88dvh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          {/* Sticky header — always reachable, large close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <h2 className="font-bold text-base">{initialData ? 'Edit Event' : 'New Event'}</h2>
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

                {/* ── Multi-day (new events only) ── */}
                {!initialData && (
                  <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Multi-day event</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Conference, trip, vacation…</p>
                      </div>
                      <Switch checked={multiDay} onCheckedChange={(v) => { setMultiDay(v); if (v) setRepeat(false); }} data-testid="switch-multiday" />
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
                            data-testid="input-end-date"
                          />
                        </div>
                        {multiDayCount > 0 && (
                          <p className="text-xs text-primary font-semibold">
                            Will create {multiDayCount} event{multiDayCount !== 1 ? 's' : ''} — one per day, all-day
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-border p-3 space-y-3">
                  <Label className="text-sm font-semibold">Time type</Label>
                  <div className="grid grid-cols-2 gap-2">{([['all-day','All day'],['timed','Timed'],['unknown','Time unknown'],['approximate','Approximate']] as [TimeStatus,string][]).map(([value,label]) => <button key={value} type="button" onClick={() => setTimeStatus(value)} className={`rounded-lg border px-2 py-2 text-xs ${timeStatus === value ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>{label}</button>)}</div>
                  {(timeStatus === 'timed' || timeStatus === 'approximate') && <><div className="grid grid-cols-2 gap-2"><FormField control={form.control} name="startTime" render={({field}) => <FormItem><FormLabel>Start time</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''}/></FormControl></FormItem>}/><FormField control={form.control} name="endTime" render={({field}) => <FormItem><FormLabel>End time</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''}/></FormControl></FormItem>}/></div>
                  <div><Label>End date</Label><Input type="date" value={temporalEndDate} min={startDateVal} onChange={e => setTemporalEndDate(e.target.value)} /></div>
                  <div className="flex gap-2"><Button type="button" size="sm" variant={timeZoneMode === 'zoned' ? 'default' : 'outline'} onClick={() => setTimeZoneMode('zoned')}>Specific timezone</Button><Button type="button" size="sm" variant={timeZoneMode === 'floating' ? 'default' : 'outline'} onClick={() => setTimeZoneMode('floating')}>Floating local time</Button></div>
                  {timeZoneMode === 'zoned' && <select value={timeZone} onChange={e => setTimeZone(e.target.value)} className="w-full h-9 rounded border bg-background px-2 text-sm">{['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Asia/Tokyo'].map(z => <option key={z}>{z}</option>)}</select>}</>}
                </div>

                {/* ── Repeat (new events only, disabled when multi-day) ── */}
                {!initialData && !multiDay && (
                  <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Repeat</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Create normal event records for each occurrence</p>
                      </div>
                      <Switch checked={repeat} onCheckedChange={setRepeat} data-testid="switch-repeat" />
                    </div>
                    {repeat && (
                      <div className="space-y-3 animate-in fade-in">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Frequency</Label>
                          <div className="grid grid-cols-2 gap-2">
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
                          <Label className="text-xs text-muted-foreground mb-1 block">How many times?</Label>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setRepeatCount(c => Math.max(2, c - 1))} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:bg-muted transition-colors">−</button>
                            <span className="text-xl font-bold w-10 text-center">{repeatCount}</span>
                            <button type="button" onClick={() => setRepeatCount(c => Math.min(52, c + 1))} className="w-10 h-10 rounded-xl border border-border text-xl font-bold flex items-center justify-center hover:bg-muted transition-colors">+</button>
                            <span className="text-xs text-muted-foreground">occurrences</span>
                          </div>
                          <p className="text-xs text-primary font-semibold mt-1.5">Will create {repeatCount} events ({repeatFreq})</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Color ── */}
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
                              className={`w-8 h-8 rounded-full border-2 ${field.value === color ? 'border-foreground scale-110' : 'border-transparent'} transition-transform`}
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

                {/* Advanced display & AI */}
                <details className="rounded-xl border border-border bg-muted/20 p-3 group">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-foreground flex items-center justify-between">
                    Advanced display &amp; AI
                    <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
                  </summary>
                  <div className="space-y-3 mt-3">
                    <FormField
                      control={form.control}
                      name="displayPriority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display priority</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {DISPLAY_PRIORITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="aiNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI notes</FormLabel>
                          <FormControl><Textarea placeholder="Planning notes for AI review..." {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sourceNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source notes</FormLabel>
                          <FormControl><Textarea placeholder="Where this came from, import details, or context..." {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </details>

                <div className="flex flex-col gap-2 pt-2 pb-2">
                  <Button type="submit" className="w-full h-11">{saveLabel}</Button>

                  {initialData && (
                    groupId && groupSize > 1 ? (
                      <>
                        <Button type="button" variant="outline" className="w-full h-10 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setConfirmDelete('single')}>
                          Delete this event only
                        </Button>
                        <Button type="button" variant="destructive" className="w-full h-10" onClick={() => setConfirmDelete('group')}>
                          Delete all {groupSize} in series
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="destructive" className="w-full h-10" onClick={() => setConfirmDelete('single')}>
                        Delete Event
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
              {confirmDelete === 'group' ? `Delete all ${groupSize} events in this series?` : `Delete "${initialData?.title}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === 'group'
                ? `This removes all ${groupSize} events in this series (recurring or multi-day). This can't be undone.`
                : "This permanently removes the event. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete('none')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete === 'group' && groupId) {
                  deleteEventGroup(groupId);
                } else if (initialData) {
                  deleteEvent(initialData.id);
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
