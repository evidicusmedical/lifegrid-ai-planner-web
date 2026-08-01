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
import { TemporalFields } from './TemporalFields';
import { eventProjectTags } from '../lib/projectOperations';
import { normalizeEditableTimeStatus, normalizeEventTimeForSave } from '../lib/gridModel';
import { isNotesOnlyRecurrenceEdit, repeatedOccurrenceRange, resolveAllDayEditRange, type RecurringNotesScope } from '../lib/recurrenceEdit';
import { paletteWithCurrentColor } from '../lib/palette';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  category: z.string().min(1),
  projectId: z.string().nullable().optional(),
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
  onSaved?: () => void;
}

export const EventSheet: React.FC<EventSheetProps> = ({ isOpen, onClose, initialData, defaultDate, onSaved }) => {
  const { addEvent, updateEvent, deleteEvent, deleteEventGroup, events, tasks, projects, categories, activeCalendar } = useAppData();

  const [confirmDelete, setConfirmDelete] = useState<'none' | 'single' | 'group'>('none');
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('weekly');
  const [repeatCount, setRepeatCount] = useState(4);
  const [timeStatus, setTimeStatus] = useState<TimeStatus>('all-day');
  const [timeZoneMode, setTimeZoneMode] = useState<TimeZoneMode>('zoned');
  const [timeZone, setTimeZone] = useState('');
  const [temporalEndDate, setTemporalEndDate] = useState('');
  const [endDateWasEdited, setEndDateWasEdited] = useState(false);
  const [notesScope, setNotesScope] = useState<RecurringNotesScope>('this-event');
  const [notesScopeWasChosen, setNotesScopeWasChosen] = useState(false);

  const groupId = initialData?.recurringGroupId;
  const groupSize = groupId ? events.filter(e => e.recurringGroupId === groupId).length : 0;

  const firstCat = categories[0];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      category: firstCat?.id ?? 'work',
      projectId: null,
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
      setTimeStatus(normalizeEditableTimeStatus(initialData?.timeStatus ?? (initialData?.startTime ? 'timed' : 'all-day')));
      setTimeZoneMode(initialData?.timeZoneMode ?? 'zoned');
      setTimeZone(initialData?.timeZone ?? '');
      setTemporalEndDate(initialData?.endDate ?? initialData?.date ?? defaultDate ?? '');
      setEndDateWasEdited(false);
      setNotesScope('this-event');
      setNotesScopeWasChosen(false);
      if (initialData) {
        form.reset({
          title: initialData.title,
          date: initialData.date,
          category: initialData.category,
          projectId: initialData.projectId ?? null,
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
          projectId: null,
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
  const watched = form.watch();
  const notesOnlyEdit = Boolean(initialData && groupSize > 1 && isNotesOnlyRecurrenceEdit({
    ...initialData,
    endDate: initialData.endDate ?? initialData.date,
  }, {
    title: watched.title,
    date: watched.date,
    endDate: temporalEndDate || watched.date,
    category: watched.category,
    startTime: watched.startTime || null,
    endTime: watched.endTime || null,
    color: watched.color,
    notes: watched.notes || null,
    displayPriority: watched.displayPriority,
    showInGrid: watched.showInGrid,
    showInExport: watched.showInExport,
    linkedTaskIds: watched.linkedTaskIds,
    aiNotes: watched.aiNotes || null,
    sourceNotes: watched.sourceNotes || null,
    timeStatus,
  }));

  useEffect(() => {
    if (!notesScopeWasChosen) setNotesScope(notesOnlyEdit ? 'entire-series' : 'this-event');
  }, [notesOnlyEdit, notesScopeWasChosen]);

  const onSubmit = (data: FormData) => {
    let normalizedTime;
    try { normalizedTime = normalizeEventTimeForSave(timeStatus, data.startTime, data.endTime); }
    catch (error) { form.setError('startTime', { message: error instanceof Error ? error.message : 'Enter valid start and end times.' }); return; }
    const allDayRange = timeStatus === 'all-day' && initialData
      ? resolveAllDayEditRange(data.date, temporalEndDate, initialData, endDateWasEdited)
      : { date: data.date, endDate: temporalEndDate || data.date };
    const base = {
      ...data,
      ...allDayRange,
      timeStatus: normalizedTime.timeStatus,
      projectId: data.projectId ?? null,
      startTime: normalizedTime.startTime,
      endTime: normalizedTime.endTime,
      timeZone: initialData?.timeZone ?? null,
      timeZoneMode: initialData?.timeZoneMode ?? null,
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
      if (notesOnlyEdit && notesScope === 'entire-series' && groupId) {
        events.filter(event => event.recurringGroupId === groupId).forEach(event => {
          const repairedRange = event.timeStatus === 'all-day'
            ? resolveAllDayEditRange(event.date, event.endDate, event, false)
            : {};
          updateEvent(event.id, {
            ...repairedRange,
            notes: base.notes,
            aiNotes: base.aiNotes,
            sourceNotes: base.sourceNotes,
          });
        });
        onSaved?.();
        onClose();
        return;
      }
      updateEvent(initialData.id, base);
      onSaved?.();
      onClose();
      return;
    }

    if (multiDay && endDate && endDate >= data.date) {
      // Multi-day owns the inclusive calendar span; the normalized base owns clock semantics.
      addEvent({ id: crypto.randomUUID(), ...base, date: data.date, endDate });
    } else if (repeat && repeatCount > 1) {
      const gid = crypto.randomUUID();
      for (let i = 0; i < repeatCount; i++) {
        const occurrenceDate = shiftByFreq(data.date, repeatFreq, i);
        const occurrenceRange = repeatedOccurrenceRange(occurrenceDate, data.date, base.endDate);
        addEvent({ id: crypto.randomUUID(), ...base, ...occurrenceRange, recurringGroupId: gid });
      }
    } else {
      addEvent({ id: crypto.randomUUID(), ...base });
    }
    onClose();
  };

  const presetColors = paletteWithCurrentColor(form.watch('color'));

  const multiDayCount = multiDay && endDate && endDate >= startDateVal ? daySpan(startDateVal, endDate) : 0;
  const saveLabel = initialData
    ? 'Save Event'
    : multiDayCount > 1
    ? 'Create Multi-day Event'
    : repeat && repeatCount > 1
    ? `Create ${repeatCount} Events`
    : 'Save Event';
  const derivedTags = initialData ? eventProjectTags(initialData, tasks, projects) : [];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="mobile-sheet rounded-t-2xl overflow-hidden flex flex-col p-0 [&>button:first-of-type]:hidden" data-testid="event-sheet"
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

                {derivedTags.length > 0 && <section aria-label="Derived Project Tags" className="rounded-xl border border-border bg-muted/20 p-3"><h3 className="text-sm font-semibold">Project Tags</h3><p className="mt-1 text-xs text-muted-foreground">Derived from linked Tasks</p><div className="mt-2 flex flex-wrap gap-2">{derivedTags.map(tag => <span key={tag.id} className="flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} /><span className="break-words">{tag.name}</span>{tag.status === 'archived' && <span className="text-muted-foreground">Archived</span>}</span>)}</div></section>}

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

                <FormField control={form.control} name="projectId" render={({ field }) => <FormItem><FormLabel>Project (optional)</FormLabel><Select value={field.value ?? 'none'} onValueChange={value => field.onChange(value === 'none' ? null : value)}><FormControl><SelectTrigger data-testid="event-project"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">No project</SelectItem>{projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></FormItem>} />

                {/* New Event span/frequency choices stay adjacent and mutually exclusive. */}
                {!initialData && (
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Event span and repeat">
                    <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div><Label className="text-sm font-semibold">Multi-day event</Label><p className="mt-0.5 text-[11px] text-muted-foreground">One Event spanning consecutive dates.</p></div>
                        <Switch checked={multiDay} disabled={repeat} onCheckedChange={(value) => { setMultiDay(value); if (value) { setRepeat(false); setRepeatFreq('weekly'); setRepeatCount(4); } }} data-testid="switch-multiday" />
                      </div>
                      {multiDay && <div className="space-y-2 animate-in fade-in"><Label className="text-xs text-muted-foreground">End Date<Input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} min={startDateVal} className="mt-1 h-9 text-sm" data-testid="input-end-date" /></Label>{multiDayCount > 0 && <p className="text-xs font-semibold text-primary" data-testid="multiday-span-summary">Spans {multiDayCount} consecutive day{multiDayCount === 1 ? '' : 's'} as one Event.</p>}</div>}
                    </div>
                    <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div><Label className="text-sm font-semibold">Repeat</Label><p className="mt-0.5 text-[11px] text-muted-foreground">Separate editable Event occurrences on a frequency.</p></div>
                        <Switch checked={repeat} disabled={multiDay} onCheckedChange={(value) => { setRepeat(value); if (value) { setMultiDay(false); setEndDate(''); } }} data-testid="switch-repeat" />
                      </div>
                      {repeat && <div className="space-y-3 animate-in fade-in"><div><Label className="mb-1 block text-xs text-muted-foreground">Frequency</Label><div className="grid grid-cols-2 gap-2">{(['daily','weekly','biweekly','monthly','yearly'] as const).map(frequency => <button key={frequency} type="button" onClick={() => setRepeatFreq(frequency)} className={`rounded-lg border py-2 text-xs font-semibold transition-all ${repeatFreq === frequency ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{frequency === 'biweekly' ? 'Bi-weekly' : frequency.charAt(0).toUpperCase()+frequency.slice(1)}</button>)}</div></div><div><Label className="mb-1 block text-xs text-muted-foreground">How many times?</Label><div className="flex items-center gap-3"><button type="button" onClick={() => setRepeatCount(count => Math.max(2,count-1))} className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-bold">−</button><span className="w-10 text-center text-xl font-bold">{repeatCount}</span><button type="button" onClick={() => setRepeatCount(count => Math.min(52,count+1))} className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-bold">+</button><span className="text-xs text-muted-foreground">occurrences</span></div><p className="mt-1.5 text-xs font-semibold text-primary">Will create {repeatCount} events ({repeatFreq})</p></div></div>}
                    </div>
                  </section>
                )}

                <TemporalFields prefix="event" date={startDateVal} startTime={form.watch('startTime') || ''} endTime={form.watch('endTime') || ''} endDate={temporalEndDate} timeStatus={timeStatus} timeZoneMode={timeZoneMode} timeZone={timeZone} displayTimeZone={''} onChange={next => { if (next.startTime !== undefined) form.setValue('startTime', next.startTime); if (next.endTime !== undefined) form.setValue('endTime', next.endTime); if (next.endDate !== undefined) { setTemporalEndDate(next.endDate); setEndDateWasEdited(true); } if (next.timeStatus !== undefined) setTimeStatus(next.timeStatus); if (next.timeZoneMode !== undefined) setTimeZoneMode(next.timeZoneMode); if (next.timeZone !== undefined) setTimeZone(next.timeZone); }} />

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

                {notesOnlyEdit && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2" data-testid="recurring-notes-scope">
                    <Label htmlFor="recurring-notes-scope-select">Apply notes change to</Label>
                    <select
                      id="recurring-notes-scope-select"
                      className="h-9 w-full rounded border bg-background px-2 text-sm"
                      value={notesScope}
                      onChange={event => { setNotesScope(event.target.value as RecurringNotesScope); setNotesScopeWasChosen(true); }}
                    >
                      <option value="entire-series">Entire series</option>
                      <option value="this-event">This event</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">Entire series updates notes on all {groupSize} materialized events. Structural changes always apply only to this event.</p>
                  </div>
                )}

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
