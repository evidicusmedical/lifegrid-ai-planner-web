import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EventSheet } from '../components/EventSheet';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const STICKY_COL_WIDTH = 40;  // w-10
const MONTH_COL_WIDTH = 160;  // w-40
const ROW_HEIGHT = 48;        // h-12
const HEADER_HEIGHT = 37;

export const GridView = () => {
  const { events } = useAppData();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [selectedCell, setSelectedCell] = useState<{ date: string, event: Event | null } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const todayStr = today.toISOString().split('T')[0];
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

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

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const isCurrentYear = year === today.getFullYear();
    const targetMonth = isCurrentYear ? currentMonth : 0;
    const targetDay = isCurrentYear ? currentDay : 1;

    const scrollLeft = Math.max(0, STICKY_COL_WIDTH + targetMonth * MONTH_COL_WIDTH - 20);
    const scrollTop = Math.max(0, (targetDay - 1) * ROW_HEIGHT + HEADER_HEIGHT - 80);

    container.scrollLeft = scrollLeft;
    container.scrollTop = scrollTop;
    hasScrolledRef.current = true;
  }, [year, currentMonth, currentDay, today]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [year]);

  const handleCellClick = (dateStr: string, existingEvents: Event[]) => {
    setSelectedCell({ date: dateStr, event: existingEvents[0] || null });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-none px-4 py-3 flex items-center justify-between border-b border-border bg-card">
        <h1 className="text-xl font-bold tracking-tight">LifeGrid</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1.5 rounded-md hover:bg-background transition-colors"
            data-testid="button-year-prev"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-sm px-2 min-w-[3rem] text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1.5 rounded-md hover:bg-background transition-colors"
            data-testid="button-year-next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        <table className="border-collapse border-spacing-0" style={{ minWidth: `${STICKY_COL_WIDTH + MONTHS.length * MONTH_COL_WIDTH}px` }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                className="sticky left-0 z-30 border-b border-r border-border bg-card p-2"
                style={{ width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH }}
              />
              {MONTHS.map((m, mIdx) => (
                <th
                  key={m}
                  className={`border-b border-r border-border p-2 text-left text-xs font-semibold uppercase tracking-wider bg-card ${mIdx === currentMonth && year === today.getFullYear() ? 'text-primary' : 'text-muted-foreground'}`}
                  style={{ width: MONTH_COL_WIDTH, minWidth: MONTH_COL_WIDTH }}
                  data-testid={`header-month-${mIdx}`}
                >
                  {m} {mIdx === currentMonth && year === today.getFullYear() ? '•' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <tr key={day}>
                <td
                  className="sticky left-0 z-10 bg-background border-b border-r border-border text-center text-[11px] font-semibold text-muted-foreground"
                  style={{ width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH, height: ROW_HEIGHT }}
                  data-testid={`row-day-${day}`}
                >
                  {day}
                </td>
                {MONTHS.map((_, mIdx) => {
                  const daysThisMonth = getDaysForMonth(mIdx);
                  const validDay = day <= daysThisMonth;
                  const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;

                  if (!validDay) {
                    return (
                      <td
                        key={`${mIdx}-${day}`}
                        className="border-b border-r border-border bg-muted/20"
                        style={{ width: MONTH_COL_WIDTH, height: ROW_HEIGHT }}
                      />
                    );
                  }

                  const dayEvents = gridData.get(dateStr) || [];
                  const dateObj = new Date(year, mIdx, day);
                  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                  return (
                    <td
                      key={`${mIdx}-${day}`}
                      className={`border-b border-r border-border p-1 align-top cursor-pointer transition-colors hover:bg-primary/5 ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : isWeekend ? 'bg-muted/10' : ''}`}
                      style={{ width: MONTH_COL_WIDTH, height: ROW_HEIGHT }}
                      onClick={() => handleCellClick(dateStr, dayEvents)}
                      data-testid={`cell-${dateStr}`}
                    >
                      <div className="flex h-full flex-col gap-0.5 overflow-hidden">
                        <span className={`text-[9px] font-bold leading-none ${isToday ? 'text-primary' : 'text-muted-foreground/40'}`}>
                          {dayOfWeek}
                        </span>
                        {dayEvents.map(evt => (
                          <div
                            key={evt.id}
                            className="rounded px-1 py-0.5 text-[10px] font-semibold truncate flex items-center gap-0.5 leading-tight text-white"
                            style={{ backgroundColor: evt.color }}
                            data-testid={`event-pill-${evt.id}`}
                          >
                            {evt.startTime && (
                              <span className="opacity-80 shrink-0 text-[8px]">{evt.startTime}</span>
                            )}
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
