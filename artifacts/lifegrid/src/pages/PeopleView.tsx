import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Plus } from 'lucide-react';
import { PersonEventSheet } from '../components/PersonEventSheet';
import { PersonEvent, PersonType } from '../types';

export const PeopleView = () => {
  const { personEvents } = useAppData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonEvent | null>(null);
  const [defaultPerson, setDefaultPerson] = useState<PersonType>('wife');

  const grouped = useMemo(() => {
    const wife = personEvents.filter(e => e.person === 'wife').sort((a, b) => a.date.localeCompare(b.date));
    const shared = personEvents.filter(e => e.person === 'shared').sort((a, b) => a.date.localeCompare(b.date));
    return { wife, shared };
  }, [personEvents]);

  const Section = ({ title, events, type }: { title: string, events: PersonEvent[], type: PersonType }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <button 
          onClick={() => {
            setSelectedEvent(null);
            setDefaultPerson(type);
            setSheetOpen(true);
          }}
          className="p-1.5 bg-muted text-muted-foreground rounded-full hover:text-foreground transition-colors"
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
              onClick={() => {
                setSelectedEvent(evt);
                setSheetOpen(true);
              }}
            >
              <div 
                className="w-1.5 h-10 rounded-full shrink-0" 
                style={{ backgroundColor: evt.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{evt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{evt.date}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none p-4 pb-2 border-b border-border bg-card sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">People</h1>
      </div>

      <div className="p-4 pb-24">
        <Section title="Wife's Schedule" events={grouped.wife} type="wife" />
        <Section title="Shared / Together" events={grouped.shared} type="shared" />
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
