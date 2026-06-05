import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EventSheet } from '../components/EventSheet';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  work:     { bg: '#3b82f6', text: '#fff' },
  personal: { bg: '#8b5cf6', text: '#fff' },
  health:   { bg: '#10b981', text: '#fff' },
  travel:   { bg: '#f59e0b', text: '#fff' },
  family:   { bg: '#ef4444', text: '#fff' },
  other:    { bg: '#6b7280', text: '#fff' },
};

const DAY_COL_W = 36;
const MONTH_COL_W = 104;
const ROW_H = 34;
const HEADER_H = 48;

export const GridView = () => {
  const { events } = useAppData();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [selectedCell, setSelectedCell] = useState<{ date: string; event: Event | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const getDaysForMonth = (m: number) =>
    m === 1 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[m];

  const gridData = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

  useEffect(() => {
    if (didScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const isCurrentYear = year === today.getFullYear();
    const targetMonth = isCurrentYear ? todayMonth : 0;
    const targetDay = isCurrentYear ? todayDay : 1;
    el.scrollLeft = Math.max(0, DAY_COL_W + targetMonth * MONTH_COL_W - 20);
    el.scrollTop = Math.max(0, (targetDay - 1) * ROW_H - 60);
    didScroll.current = true;
  });

  useEffect(() => { didScroll.current = false; }, [year]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--background))' }}>

      {/* Header bar */}
      <div className="flex-none px-4 py-2.5 flex items-center justify-between border-b border-border bg-card">
        <h1 className="text-lg font-bold tracking-tight">LifeGrid</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-prev">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold px-2 min-w-[3rem] text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-next">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <table
          className="border-collapse"
          style={{ minWidth: DAY_COL_W + MONTHS.length * MONTH_COL_W }}
        >
          {/* Month header row */}
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Day-number column header (empty) */}
              <th
                className="sticky left-0 z-30 border-b-2 border-r border-border bg-card"
                style={{ width: DAY_COL_W, minWidth: DAY_COL_W, height: HEADER_H }}
              />
              {MONTHS.map((m, mIdx) => {
                const isCurrent = mIdx === todayMonth && year === today.getFullYear();
                return (
                  <th
                    key={m}
                    className={`border-b-2 border-r border-border text-left align-bottom bg-card`}
                    style={{ width: MONTH_COL_W, minWidth: MONTH_COL_W, height: HEADER_H, padding: '4px 6px' }}
                    data-testid={`header-month-${mIdx}`}
                  >
                    <div className={`text-[11px] font-bold uppercase tracking-widest leading-none ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {m}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isCurrent ? 'text-primary/70' : 'text-muted-foreground/50'}`}>
                      {year}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <tr key={day} style={{ height: ROW_H }}>
                {/* Sticky day-number column */}
                <td
                  className="sticky left-0 z-10 border-b border-r border-border text-center font-bold bg-card text-muted-foreground"
                  style={{ width: DAY_COL_W, minWidth: DAY_COL_W, fontSize: 11 }}
                  data-testid={`row-day-${day}`}
                >
                  {day}
                </td>

                {MONTHS.map((_, mIdx) => {
                  const maxDay = getDaysForMonth(mIdx);
                  const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;

                  if (day > maxDay) {
                    return (
                      <td
                        key={`${mIdx}-${day}`}
                        className="border-b border-r border-border"
                        style={{ background: 'hsl(var(--muted) / 0.25)' }}
                      />
                    );
                  }

                  const dateObj = new Date(year, mIdx, day);
                  const dow = DOW[dateObj.getDay()];
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  const dayEvents = gridData.get(dateStr) ?? [];
                  const evt = dayEvents[0] ?? null;

                  let bgColor = 'transparent';
                  let textColor = 'hsl(var(--foreground))';
                  let label = '';
                  let timeLabel = '';

                  if (evt) {
                    bgColor = evt.color;
                    textColor = '#fff';
                    label = evt.title;
                    timeLabel = evt.startTime ?? '';
                  }

                  const hasMore = dayEvents.length > 1;

                  return (
                    <td
                      key={`${mIdx}-${day}`}
                      className={`border-b border-r border-border cursor-pointer select-none transition-opacity hover:opacity-80 relative`}
                      style={{
                        width: MONTH_COL_W,
                        minWidth: MONTH_COL_W,
                        background: isToday && !evt
                          ? 'hsl(var(--primary) / 0.12)'
                          : isWeekend && !evt
                          ? 'hsl(var(--muted) / 0.4)'
                          : evt
                          ? bgColor
                          : 'transparent',
                        padding: '2px 4px',
                        verticalAlign: 'top',
                      }}
                      onClick={() => setSelectedCell({ date: dateStr, event: evt })}
                      data-testid={`cell-${dateStr}`}
                    >
                      {/* Day-of-week + content */}
                      <div className="flex items-start gap-1 h-full overflow-hidden">
                        {/* DOW badge */}
                        <span
                          className="text-[9px] font-bold shrink-0 leading-tight mt-px"
                          style={{
                            color: evt ? 'rgba(255,255,255,0.75)' : isToday ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)',
                          }}
                        >
                          {dow}
                        </span>

                        {/* Event label */}
                        {evt && (
                          <span
                            className="text-[10px] font-semibold truncate leading-tight mt-px flex-1"
                            style={{ color: textColor }}
                          >
                            {timeLabel ? `${timeLabel} ` : ''}{label}
                          </span>
                        )}
                      </div>

                      {/* "more" badge if multiple events */}
                      {hasMore && (
                        <span
                          className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-70"
                          style={{ color: textColor }}
                        >
                          +{dayEvents.length - 1}
                        </span>
                      )}

                      {/* Today indicator */}
                      {isToday && (
                        <span
                          className="absolute top-0 left-0 w-full h-0.5 bg-primary"
                        />
                      )}
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
