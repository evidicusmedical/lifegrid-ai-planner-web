import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Plus, Settings2 } from 'lucide-react';
import { PersonEventSheet } from '../components/PersonEventSheet';
import { PersonEvent } from '../types';
import { formatDate } from '../lib/format';
import { getLocalTemporalOccurrence, temporalSummary } from '../lib/temporal';

export const PeopleView = () => {
  const { personEvents, people, activeCalendar } = useAppData();
  const orderedPeople = useMemo(() => [...people].sort((a, b) => a.order - b.order), [people]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonEvent | null>(null);
  const [defaultPerson, setDefaultPerson] = useState<string>(orderedPeople[0]?.id ?? 'wife');

  const grouped = useMemo(() => {
    const map = new Map<string, PersonEvent[]>();
    orderedPeople.forEach(p => map.set(p.id, []));
    personEvents.forEach(e => {
      const arr = map.get(e.person);
      if (arr) arr.push(e);
      else map.set(e.person, [e]);
    });
    map.forEach(arr => arr.sort((a, b) => { const ao = getLocalTemporalOccurrence(a); const bo = getLocalTemporalOccurrence(b); return `${ao.displayedStartDate} ${ao.displayedStartTime ?? ''}`.localeCompare(`${bo.displayedStartDate} ${bo.displayedStartTime ?? ''}`); }));
    return map;
  }, [personEvents, orderedPeople, activeCalendar.displayTimeZone]);

  const openAdd = (personId: string) => {
    setSelectedEvent(null);
    setDefaultPerson(personId);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none p-4 pb-2 border-b border-border bg-card sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">People</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Track other people's schedules — manage sections in Settings.</p>
      </div>

      <div className="p-4 pb-24">
        {people.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10">
            <Settings2 className="mx-auto mb-2 opacity-20" size={40} />
            <p className="text-sm">No people sections yet.</p>
            <p className="text-xs mt-1">Add people in Settings to track their schedules here.</p>
          </div>
        ) : (
          orderedPeople.map(person => {
            const events = grouped.get(person.id) ?? [];
            return (
              <div key={person.id} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />
                    <h2 className="text-lg font-bold text-foreground">{person.label}</h2>
                  </div>
                  <button
                    onClick={() => openAdd(person.id)}
                    className="p-1.5 bg-muted text-muted-foreground rounded-full hover:text-foreground transition-colors"
                    data-testid={`add-person-event-${person.id}`}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="space-y-2">
                  {events.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic py-2">No entries yet.</div>
                  ) : (
                    events.map(evt => (
                      <div
                        key={evt.id}
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => { setSelectedEvent(evt); setSheetOpen(true); }}
                      >
                        <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: evt.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{evt.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {(() => { const occurrence = getLocalTemporalOccurrence(evt); return `${formatDate(occurrence.displayedStartDate)} · ${temporalSummary({ ...evt, date: occurrence.displayedStartDate, endDate: occurrence.displayedEndDate, startTime: occurrence.displayedStartTime, endTime: occurrence.displayedEndTime })}${occurrence.converted ? ` · original ${evt.timeZone}` : ''}`; })()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {sheetOpen && (
        <PersonEventSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          initialData={selectedEvent}
          defaultPerson={defaultPerson}
        />
      )}
    </div>
  );
};
