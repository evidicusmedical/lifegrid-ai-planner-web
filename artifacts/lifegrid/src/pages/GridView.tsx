import React, { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EventSheet } from '../components/EventSheet';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const GridView = () => {
  const { events } = useAppData();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedCell, setSelectedCell] = useState<{ date: string, event: Event | null } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const getDaysForMonth = (m: number) => {
    if (m === 1 && isLeapYear(year)) return 29;
    return DAYS_IN_MONTH[m];
  };

  const gridData = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(e => {
      const existing = map.get(e.date) || [];
      existing.push(e);
      map.set(e.date, existing);
    });
    return map;
  }, [events]);

  const handleCellClick = (dateStr: string, existingEvents: Event[]) => {
    // If multiple events exist, just edit the first one for now (or could build a picker)
    setSelectedCell({ date: dateStr, event: existingEvents[0] || null });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-none p-4 pb-2 flex items-center justify-between border-b border-border bg-card">
        <h1 className="text-xl font-bold tracking-tight">LifeGrid</h1>
        <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
          <button onClick={() => setYear(year - 1)} className="p-1 rounded-md hover:bg-background">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-sm px-2">{year}</span>
          <button onClick={() => setYear(year + 1)} className="p-1 rounded-md hover:bg-background">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto relative">
        <div className="min-w-max inline-block align-top">
          <table className="border-collapse border-spacing-0 w-full table-fixed">
            <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur shadow-sm">
              <tr>
                <th className="w-10 sticky left-0 z-30 bg-background border-b border-r border-border p-2"></th>
                {MONTHS.map(m => (
                  <th key={m} className="w-40 border-b border-r border-border p-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <tr key={day}>
                  <td className="w-10 sticky left-0 z-10 bg-background border-b border-r border-border p-1 text-center text-[10px] font-medium text-muted-foreground">
                    {day}
                  </td>
                  {MONTHS.map((_, mIdx) => {
                    const daysThisMonth = getDaysForMonth(mIdx);
                    const validDay = day <= daysThisMonth;
                    const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    
                    if (!validDay) {
                      return <td key={`${mIdx}-${day}`} className="border-b border-r border-border bg-muted/30"></td>;
                    }

                    const dayEvents = gridData.get(dateStr) || [];
                    const dateObj = new Date(year, mIdx, day);
                    const dayOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()];

                    return (
                      <td 
                        key={`${mIdx}-${day}`} 
                        className={`border-b border-r border-border p-1 align-top h-12 cursor-pointer transition-colors hover:bg-muted/50 ${isToday ? 'bg-primary/5' : ''}`}
                        onClick={() => handleCellClick(dateStr, dayEvents)}
                      >
                        <div className="flex h-full flex-col gap-1 overflow-hidden">
                          <span className={`text-[9px] font-bold ${isToday ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            {dayOfWeek}
                          </span>
                          {dayEvents.map(evt => (
                            <div key={evt.id} className="rounded-sm px-1 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 leading-tight text-white shadow-sm" style={{ backgroundColor: evt.color }}>
                              {evt.startTime && <span className="opacity-75">{evt.startTime}</span>}
                              <span className="truncate">{evt.title}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCell && (
        <EventSheet 
          isOpen={true} 
          onClose={() => setSelectedCell(null)} 
          initialData={selectedCell.event} 
          defaultDate={selectedCell.date} 
        />
      )}
    </div>
  );
};
