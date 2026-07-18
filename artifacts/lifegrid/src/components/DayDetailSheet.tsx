import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types';
import { formatDateLong } from '../lib/format';
import { getDisplayedTemporalOccurrence } from '../lib/temporal';
import { eventProjectTags } from '../lib/projectOperations';

interface DayDetailSheetProps {
  date: string | null;
  onClose: () => void;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: Event) => void;
}

export const DayDetailSheet: React.FC<DayDetailSheetProps> = ({ date, onClose, onAddEvent, onEditEvent }) => {
  const { events, tasks, projects, categories, activeCalendar } = useAppData();

  const dayEvents = date
    ? events
        .filter(e => getDisplayedTemporalOccurrence(e, activeCalendar.displayTimeZone).displayedStartDate === date)
        .sort((a, b) => (getDisplayedTemporalOccurrence(a, activeCalendar.displayTimeZone).displayedStartTime || '99:99').localeCompare(getDisplayedTemporalOccurrence(b, activeCalendar.displayTimeZone).displayedStartTime || '99:99'))
    : [];

  const catLabel = (id: string) => categories.find(c => c.id === id)?.label ?? id;

  return (
    <Sheet open={!!date} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="mobile-sheet mobile-scroll max-h-none overflow-y-auto rounded-t-2xl sm:max-w-md sm:mx-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2" data-testid="day-detail-sheet">
        <SheetHeader>
          <SheetTitle>{date ? formatDateLong(date) : ''}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 pb-4">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No events on this day yet.</p>
          ) : (
            dayEvents.map(evt => (
              <button
                key={evt.id}
                onClick={() => onEditEvent(evt)}
                className="w-full min-h-11 text-left bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-colors flex items-start gap-3"
                data-testid={`day-event-${evt.id}`}
              >
                <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: evt.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-tight">{evt.title}</div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground wrap-anywhere">
                    {(evt.startTime || evt.endTime) && (() => { const occurrence = getDisplayedTemporalOccurrence(evt, activeCalendar.displayTimeZone); return (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {occurrence.displayedStartTime}{occurrence.displayedEndTime ? `–${occurrence.displayedEndTime}` : ''} {occurrence.converted ? activeCalendar.displayTimeZone : ''}
                      </span>
                    ); })()}
                    <span className="capitalize">{catLabel(evt.category)}</span>
                  </div>
                  {evt.notes && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{evt.notes}</p>}
                  {eventProjectTags(evt, tasks, projects).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Derived Project Tags">{eventProjectTags(evt, tasks, projects).map(tag => <span key={tag.id} className="flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} /><span className="break-words">{tag.name}</span>{tag.status === 'archived' && <span className="text-muted-foreground">Archived</span>}</span>)}</div>}
                  {getDisplayedTemporalOccurrence(evt, activeCalendar.displayTimeZone).converted && <p className="text-[11px] text-muted-foreground mt-1">Original: {evt.date} {evt.startTime}–{evt.endTime} {evt.timeZone}</p>}
                </div>
              </button>
            ))
          )}

          <Button className="w-full mt-2" onClick={() => date && onAddEvent(date)}>
            <Plus size={16} className="mr-1" /> Add Event
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
