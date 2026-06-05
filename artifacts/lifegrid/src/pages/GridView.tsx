import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useTheme } from '../context/ThemeContext';
import { Event } from '../types';
import { ChevronLeft, ChevronRight, Sun, Moon, Image, CalendarDays, Plus, Check, ChevronDown } from 'lucide-react';
import { EventSheet } from '../components/EventSheet';
import { DayDetailSheet } from '../components/DayDetailSheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { toISODate } from '../lib/format';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DOW_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const DAY_COL_W = 32;
const MONTH_COL_W = 110;
const ROW_H = 52;
const HEADER_H = 44;
const MAX_VISIBLE_EVENTS = 3;

export const GridView = () => {
  const { events, categories, calendars, activeCalendarId, switchCalendar } = useAppData();
  const { theme, toggleTheme } = useTheme();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [focusedCats, setFocusedCats] = useState<Set<string>>(new Set());

  const scrollRef    = useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLTableElement>(null);
  const didScrollRef = useRef(false);

  const todayStr   = toISODate(today);
  const todayMonth = today.getMonth();
  const todayDay   = today.getDate();

  const getDaysForMonth = (m: number) => (m === 1 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[m]);

  const activeCalendar = calendars.find(c => c.id === activeCalendarId);

  const gridData = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

  const isFocusActive = focusedCats.size > 0;
  const toggleCat = (id: string) =>
    setFocusedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const dim = (catId: string) => isFocusActive && !focusedCats.has(catId);

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

  // ── Image export (html-to-image renders modern CSS correctly) ──
  const handleExport = useCallback(async () => {
    const table = tableRef.current;
    const container = scrollRef.current;
    if (!table || !container) return;
    setExporting(true);
    toast.loading('Generating grid image…', { id: 'export' });

    const prevOverflow = container.style.overflow;
    const prevW = container.style.width;
    const prevH = container.style.height;
    container.style.overflow = 'visible';
    container.style.width  = table.scrollWidth + 'px';
    container.style.height = table.scrollHeight + 'px';

    try {
      const dataUrl = await toPng(table, {
        pixelRatio: 2,
        backgroundColor: theme === 'dark' ? '#0d1526' : '#ffffff',
        width: table.scrollWidth,
        height: table.scrollHeight,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `lifegrid-${activeCalendar?.name ?? 'calendar'}-${year}.png`.replace(/\s+/g, '-');
      a.click();
      toast.success('Grid exported as PNG!', { id: 'export' });
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Export failed — try again', { id: 'export' });
    } finally {
      container.style.overflow = prevOverflow;
      container.style.width    = prevW;
      container.style.height   = prevH;
      setExporting(false);
    }
  }, [year, theme, activeCalendar]);

  const jumpToToday = () => {
    setYear(today.getFullYear());
    didScrollRef.current = false;
  };

  const openAdd = (date: string) => {
    setEditEvent(null);
    setAddDate(date);
    setDetailDate(null);
    setEventSheetOpen(true);
  };
  const openEdit = (evt: Event) => {
    setEditEvent(evt);
    setAddDate(null);
    setDetailDate(null);
    setEventSheetOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">

      {/* ── Header bar ── */}
      <div className="flex-none px-3 py-2 flex items-center gap-2 border-b border-border bg-card">
        {/* Calendar version switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 max-w-[8rem] text-left"
              data-testid="button-calendar-switcher"
            >
              <span className="text-base font-bold tracking-tight truncate">{activeCalendar?.name ?? 'LifeGrid'}</span>
              <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Calendar versions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {calendars.map(c => (
              <DropdownMenuItem key={c.id} onClick={() => switchCalendar(c.id)} className="flex items-center justify-between">
                <span className="truncate">{c.name}</span>
                {c.id === activeCalendarId && <Check size={14} className="text-primary shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              Manage versions in Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Year nav */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 ml-1">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-prev">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold px-1.5 min-w-[3rem] text-center tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-next">
            <ChevronRight size={14} />
          </button>
        </div>

        <button
          onClick={jumpToToday}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          data-testid="button-today"
        >
          <CalendarDays size={12} />
          Today
        </button>

        <div className="flex-1" />

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

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
          data-testid="button-theme-toggle"
          title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* ── Color legend (clickable focus toggles) ── */}
      <div className="flex-none px-3 py-1.5 flex items-center gap-2 border-b border-border bg-card/50 overflow-x-auto">
        {categories.map(c => {
          const on = focusedCats.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full transition-all ${
                on ? 'bg-primary/15 ring-1 ring-primary/40' : isFocusActive ? 'opacity-40' : ''
              }`}
              data-testid={`legend-${c.id}`}
              title={`Focus on ${c.label}`}
            >
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
              <span className="text-[10px] font-medium text-muted-foreground">{c.label}</span>
            </button>
          );
        })}
        {isFocusActive && (
          <button
            onClick={() => setFocusedCats(new Set())}
            className="shrink-0 text-[10px] font-semibold text-primary px-1.5"
            data-testid="legend-clear"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Scrollable grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <table
          ref={tableRef}
          className="border-collapse bg-background"
          style={{ minWidth: DAY_COL_W + MONTHS.length * MONTH_COL_W }}
        >
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

                  if (day > maxDay) {
                    return (
                      <td
                        key={`${mIdx}-${day}`}
                        className="border-b border-r border-border"
                        style={{
                          width: MONTH_COL_W,
                          background: theme === 'dark' ? 'rgba(148,163,184,0.08)' : '#f5f5f5',
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

                  let cellBg: string;
                  if (isToday) {
                    cellBg = theme === 'dark' ? 'rgba(59,130,246,0.15)' : '#eff6ff';
                  } else if (isWeekend) {
                    cellBg = theme === 'dark' ? 'rgba(148,163,184,0.10)' : '#fafafa';
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
                      onClick={() => setDetailDate(dateStr)}
                      data-testid={`cell-${dateStr}`}
                    >
                      {isToday && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />}

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

                      <div className="flex flex-col gap-px overflow-hidden">
                        {visEvents.map(evt => (
                          <div
                            key={evt.id}
                            className="rounded-sm px-1 flex items-center gap-0.5 overflow-hidden transition-opacity"
                            style={{
                              backgroundColor: evt.color,
                              height: 14,
                              opacity: dim(evt.category) ? 0.18 : 1,
                            }}
                            data-testid={`event-pill-${evt.id}`}
                          >
                            {evt.startTime && (
                              <span className="text-white/80 shrink-0 tabular-nums" style={{ fontSize: 7, lineHeight: 1 }}>
                                {evt.startTime}
                              </span>
                            )}
                            <span className="text-white font-semibold truncate" style={{ fontSize: 8.5, lineHeight: 1 }}>
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

      {/* Add-event FAB */}
      <button
        onClick={() => openAdd(year === today.getFullYear() ? todayStr : `${year}-01-01`)}
        className="absolute bottom-20 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        data-testid="button-add-event"
        title="Add event"
      >
        <Plus size={22} />
      </button>

      <DayDetailSheet
        date={detailDate}
        onClose={() => setDetailDate(null)}
        onAddEvent={openAdd}
        onEditEvent={openEdit}
      />

      {eventSheetOpen && (
        <EventSheet
          isOpen={eventSheetOpen}
          onClose={() => { setEventSheetOpen(false); setEditEvent(null); setAddDate(null); }}
          initialData={editEvent}
          defaultDate={addDate ?? undefined}
        />
      )}
    </div>
  );
};
