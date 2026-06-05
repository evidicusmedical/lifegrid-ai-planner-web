import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useTheme } from '../context/ThemeContext';
import { Event } from '../types';
import { ChevronLeft, ChevronRight, Sun, Moon, Image, CalendarDays } from 'lucide-react';
import { EventSheet } from '../components/EventSheet';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DOW_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const DAY_COL_W = 32;
const MONTH_COL_W = 110;
const ROW_H = 52;  // taller rows to fit multiple events
const HEADER_H = 44;
const MAX_VISIBLE_EVENTS = 3;

export const GridView = () => {
  const { events } = useAppData();
  const { theme, toggleTheme } = useTheme();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedCell, setSelectedCell] = useState<{ date: string; event: Event | null } | null>(null);
  const [exporting, setExporting] = useState(false);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLTableElement>(null);
  const didScrollRef = useRef(false);

  const todayStr   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const todayMonth = today.getMonth();
  const todayDay   = today.getDate();

  const getDaysForMonth = (m: number) => (m === 1 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[m]);

  const gridData = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

  // Auto-scroll to current month/day on mount or year change
  useEffect(() => {
    if (didScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const isCurrentYear = year === today.getFullYear();
    const targetMonth = isCurrentYear ? todayMonth : 0;
    const targetDay   = isCurrentYear ? todayDay   : 1;
    el.scrollLeft = Math.max(0, targetMonth * MONTH_COL_W - 10);
    el.scrollTop  = Math.max(0, (targetDay - 1) * ROW_H - 80);
    didScrollRef.current = true;
  });

  useEffect(() => { didScrollRef.current = false; }, [year]);

  // ── Image export ──────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const table = tableRef.current;
    if (!table) return;
    setExporting(true);
    toast.loading('Generating grid image…', { id: 'export' });
    try {
      // Temporarily expand the scroll container so entire table is captured
      const container = scrollRef.current!;
      const prevOverflow = container.style.overflow;
      const prevW = container.style.width;
      const prevH = container.style.height;
      container.style.overflow = 'visible';
      container.style.width  = table.scrollWidth  + 'px';
      container.style.height = table.scrollHeight + 'px';

      const canvas = await html2canvas(table, {
        scale: 2,
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#0d1526' : '#ffffff',
        logging: false,
      });

      container.style.overflow = prevOverflow;
      container.style.width    = prevW;
      container.style.height   = prevH;

      const url = canvas.toDataURL('image/png');
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `lifegrid-${year}.png`;
      a.click();
      toast.success('Grid exported as PNG!', { id: 'export' });
    } catch {
      toast.error('Export failed — try again', { id: 'export' });
    } finally {
      setExporting(false);
    }
  }, [year, theme]);

  // ── Jump to today ──────────────────────────────────────────────
  const jumpToToday = () => {
    setYear(today.getFullYear());
    didScrollRef.current = false;
  };

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Header bar ── */}
      <div className="flex-none px-3 py-2 flex items-center gap-2 border-b border-border bg-card">
        <h1 className="text-base font-bold tracking-tight mr-1">LifeGrid</h1>

        {/* Year nav */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-prev">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold px-1.5 min-w-[3rem] text-center tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-next">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={jumpToToday}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          data-testid="button-today"
        >
          <CalendarDays size={12} />
          Today
        </button>

        <div className="flex-1" />

        {/* Export image */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-muted-foreground transition-colors disabled:opacity-50"
          data-testid="button-export"
          title="Export grid as PNG"
        >
          <Image size={12} />
          Export
        </button>

        {/* Day / Night toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
          data-testid="button-theme-toggle"
          title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* ── Color legend ── */}
      <div className="flex-none px-3 py-1.5 flex items-center gap-3 border-b border-border bg-card/50 overflow-x-auto">
        {[
          { label: 'Work',     color: '#2563eb' },
          { label: 'Personal', color: '#7c3aed' },
          { label: 'Health',   color: '#059669' },
          { label: 'Travel',   color: '#d97706' },
          { label: 'Family',   color: '#dc2626' },
          { label: 'Other',    color: '#6b7280' },
        ].map(c => (
          <div key={c.label} className="flex items-center gap-1 shrink-0">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
            <span className="text-[10px] font-medium text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>

      {/* ── Scrollable grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <table
          ref={tableRef}
          className="border-collapse"
          style={{ minWidth: DAY_COL_W + MONTHS.length * MONTH_COL_W }}
        >
          {/* Month header row */}
          <thead className="sticky top-0 z-20">
            <tr style={{ height: HEADER_H }}>
              <th
                className="sticky left-0 z-30 border-b-2 border-r border-border bg-card"
                style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
              />
              {MONTHS.map((m, mIdx) => {
                const isCurrent = mIdx === todayMonth && year === today.getFullYear();
                return (
                  <th
                    key={m}
                    className={`border-b-2 border-r border-border text-left align-bottom bg-card ${isCurrent ? 'bg-primary/5' : ''}`}
                    style={{ width: MONTH_COL_W, minWidth: MONTH_COL_W, padding: '4px 6px' }}
                    data-testid={`header-month-${mIdx}`}
                  >
                    <div className={`text-[11px] font-extrabold uppercase tracking-widest leading-none ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {m}
                    </div>
                    <div className={`text-[9px] mt-0.5 font-medium ${isCurrent ? 'text-primary/60' : 'text-muted-foreground/40'}`}>
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
                {/* Sticky day number column */}
                <td
                  className="sticky left-0 z-10 border-b border-r border-border bg-card text-center font-bold text-muted-foreground select-none"
                  style={{ width: DAY_COL_W, minWidth: DAY_COL_W, fontSize: 10 }}
                  data-testid={`row-day-${day}`}
                >
                  {day}
                </td>

                {MONTHS.map((_, mIdx) => {
                  const maxDay  = getDaysForMonth(mIdx);
                  const dateStr = `${year}-${String(mIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const isToday = dateStr === todayStr;

                  // Invalid day for this month
                  if (day > maxDay) {
                    return (
                      <td
                        key={`${mIdx}-${day}`}
                        className="border-b border-r border-border"
                        style={{
                          width: MONTH_COL_W,
                          background: theme === 'dark' ? 'hsl(var(--muted)/0.2)' : '#f5f5f5',
                        }}
                      />
                    );
                  }

                  const dateObj  = new Date(year, mIdx, day);
                  const dow      = DOW_SHORT[dateObj.getDay()];
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  const dayEvents = gridData.get(dateStr) ?? [];
                  const visEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                  const overflow  = dayEvents.length - MAX_VISIBLE_EVENTS;

                  // Cell background (empty cells)
                  let cellBg: string;
                  if (isToday) {
                    cellBg = theme === 'dark' ? 'hsl(var(--primary)/0.15)' : '#eff6ff';
                  } else if (isWeekend) {
                    cellBg = theme === 'dark' ? 'hsl(var(--muted)/0.25)' : '#fafafa';
                  } else {
                    cellBg = 'transparent';
                  }

                  return (
                    <td
                      key={`${mIdx}-${day}`}
                      className="border-b border-r border-border cursor-pointer select-none relative align-top"
                      style={{
                        width: MONTH_COL_W,
                        minWidth: MONTH_COL_W,
                        height: ROW_H,
                        background: cellBg,
                        padding: '2px 3px',
                      }}
                      onClick={() => setSelectedCell({ date: dateStr, event: dayEvents[0] ?? null })}
                      data-testid={`cell-${dateStr}`}
                    >
                      {/* Today top border accent */}
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                      )}

                      {/* Day-of-week label */}
                      <div
                        className="text-[8px] font-bold leading-none mb-0.5"
                        style={{
                          color: isToday
                            ? 'hsl(var(--primary))'
                            : isWeekend
                            ? theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
                            : theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                        }}
                      >
                        {dow}
                      </div>

                      {/* Event pills — stacked */}
                      <div className="flex flex-col gap-px overflow-hidden">
                        {visEvents.map(evt => (
                          <div
                            key={evt.id}
                            className="rounded-sm px-1 flex items-center gap-0.5 overflow-hidden"
                            style={{
                              backgroundColor: evt.color,
                              height: 14,
                            }}
                            data-testid={`event-pill-${evt.id}`}
                          >
                            {evt.startTime && (
                              <span
                                className="text-white/80 shrink-0 tabular-nums"
                                style={{ fontSize: 7, lineHeight: 1 }}
                              >
                                {evt.startTime}
                              </span>
                            )}
                            <span
                              className="text-white font-semibold truncate"
                              style={{ fontSize: 8.5, lineHeight: 1 }}
                            >
                              {evt.title}
                            </span>
                          </div>
                        ))}

                        {overflow > 0 && (
                          <div
                            className="text-[7px] font-bold px-1"
                            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', lineHeight: 1 }}
                          >
                            +{overflow} more
                          </div>
                        )}
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
