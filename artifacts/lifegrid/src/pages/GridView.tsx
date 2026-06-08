import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useTheme } from '../context/ThemeContext';
import { Event, Project, Task } from '../types';
import { ChevronLeft, ChevronRight, Sun, Moon, Image, CalendarDays, Plus, Check, ChevronDown, X, Download } from 'lucide-react';
import { EventSheet } from '../components/EventSheet';
import { DayDetailSheet } from '../components/DayDetailSheet';
import { Button } from '@/components/ui/button';
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
const MAX_VISIBLE_EVENTS = 5;
const EVENT_PILL_H = 10;
const EXPORT_ROW_BASE_H = 16;
const TARGETED_EXPORT_MAX_DAYS = 45;
const TARGETED_EXPORT_COLS = 7;

type ExportDatePreset = 'current' | 'next7' | 'next14' | 'next30' | 'custom';
type ExportProjectFilter = 'all' | string;

interface GridExportFilters {
  datePreset: ExportDatePreset;
  customStart: string;
  customEnd: string;
  categoryMode: 'all' | 'selected';
  selectedCategoryIds: string[];
  projectId: ExportProjectFilter;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseISODate = (value: string) => {
  const [yearPart, monthPart, dayPart] = value.split('-').map(Number);
  return new Date(yearPart, monthPart - 1, dayPart);
};

const daysBetweenInclusive = (start: string, end: string) => {
  const startTime = parseISODate(start).getTime();
  const endTime = parseISODate(end).getTime();
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
};

const getDatesInRange = (start: string, end: string) => {
  const dates: string[] = [];
  let cursor = parseISODate(start);
  const endDate = parseISODate(end);
  while (cursor <= endDate) {
    dates.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
};

const getEventProjectIds = (event: Event, taskById: Map<string, Task>, tasksByLinkedEvent: Map<string, Task[]>) => {
  const projectIds = new Set<string>();
  event.linkedTaskIds.forEach(taskId => {
    const task = taskById.get(taskId);
    if (task?.projectId) projectIds.add(task.projectId);
  });
  (tasksByLinkedEvent.get(event.id) ?? []).forEach(task => {
    if (task.projectId) projectIds.add(task.projectId);
  });
  return projectIds;
};

const sortProjectsForExport = (a: Project, b: Project) => {
  const byOrder = a.order - b.order;
  if (byOrder !== 0) return byOrder;
  return a.name.localeCompare(b.name);
};

export const GridView = () => {
  const { events, tasks, categories, projects, calendars, activeCalendarId, switchCalendar } = useAppData();
  const { theme, toggleTheme } = useTheme();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const exportPixelRatio = 1;
  const [exportOptionsOpen, setExportOptionsOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<GridExportFilters>(() => ({
    datePreset: 'current',
    customStart: toISODate(today),
    customEnd: toISODate(today),
    categoryMode: 'all',
    selectedCategoryIds: [],
    projectId: 'all',
  }));
  const [focusedCats, setFocusedCats] = useState<Set<string>>(new Set());

  const scrollRef    = useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLTableElement>(null);
  const targetedExportRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);

  const todayStr   = toISODate(today);
  const todayMonth = today.getMonth();
  const todayDay   = today.getDate();

  const getDaysForMonth = (m: number) => (m === 1 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[m]);

  const activeCalendar = calendars.find(c => c.id === activeCalendarId);

  const categoryRank = useMemo(() => new Map(categories.map((c, idx) => [c.id, idx])), [categories]);
  const sortedProjects = useMemo(() => [...projects].sort(sortProjectsForExport), [projects]);

  const taskById = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const tasksByLinkedEvent = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      task.linkedEventIds.forEach(eventId => {
        const linkedTasks = map.get(eventId) ?? [];
        linkedTasks.push(task);
        map.set(eventId, linkedTasks);
      });
    });
    return map;
  }, [tasks]);

  const getExportDateRange = useCallback(() => {
    if (exportFilters.datePreset === 'custom') {
      return { start: exportFilters.customStart, end: exportFilters.customEnd };
    }
    if (exportFilters.datePreset === 'current') {
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    const days = exportFilters.datePreset === 'next7' ? 7 : exportFilters.datePreset === 'next14' ? 14 : 30;
    return { start: todayStr, end: toISODate(addDays(today, days - 1)) };
  }, [exportFilters.customEnd, exportFilters.customStart, exportFilters.datePreset, today, todayStr, year]);

  const selectedCategorySet = useMemo(() => new Set(exportFilters.selectedCategoryIds), [exportFilters.selectedCategoryIds]);

  const exportFilteredEvents = useMemo(() => {
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) return [];
    return events.filter(event => {
      if (event.date < start || event.date > end) return false;
      if (exportFilters.categoryMode === 'selected' && !selectedCategorySet.has(event.category)) return false;
      if (exportFilters.projectId !== 'all') {
        const eventProjectIds = getEventProjectIds(event, taskById, tasksByLinkedEvent);
        if (!eventProjectIds.has(exportFilters.projectId)) return false;
      }
      return true;
    });
  }, [events, exportFilters.categoryMode, exportFilters.projectId, getExportDateRange, selectedCategorySet, taskById, tasksByLinkedEvent]);

  const eventsForGrid = exporting ? exportFilteredEvents : events;

  const sortEventsForCell = useCallback((a: Event, b: Event) => {
    const byPriority = (a.displayPriority ?? 4) - (b.displayPriority ?? 4);
    if (byPriority !== 0) return byPriority;
    const aAllDay = !a.startTime;
    const bAllDay = !b.startTime;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    if (!aAllDay && !bAllDay) {
      const byTime = (a.startTime ?? '').localeCompare(b.startTime ?? '');
      if (byTime !== 0) return byTime;
    }
    const byCat = (categoryRank.get(a.category) ?? 999) - (categoryRank.get(b.category) ?? 999);
    if (byCat !== 0) return byCat;
    return a.title.localeCompare(b.title);
  }, [categoryRank]);

  const gridData = useMemo(() => {
    const map = new Map<string, Event[]>();
    eventsForGrid.forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    map.forEach(arr => arr.sort(sortEventsForCell));
    return map;
  }, [eventsForGrid, sortEventsForCell]);

  const isFocusActive = focusedCats.size > 0;
  const toggleCat = (id: string) =>
    setFocusedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const dim = (catId: string) => isFocusActive && !focusedCats.has(catId);

  const setDatePreset = (datePreset: ExportDatePreset) => {
    setExportFilters(prev => ({ ...prev, datePreset }));
  };

  const toggleExportCategory = (id: string) => {
    setExportFilters(prev => {
      const selected = new Set(prev.selectedCategoryIds);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      return { ...prev, categoryMode: 'selected', selectedCategoryIds: Array.from(selected) };
    });
  };

  const exportRange = getExportDateRange();
  const isDefaultExportFilter =
    exportFilters.datePreset === 'current' &&
    exportFilters.categoryMode === 'all' &&
    exportFilters.projectId === 'all';
  const isTargetedDateExport = exportFilters.datePreset !== 'current';
  const exportDayCount = exportRange.start && exportRange.end && exportRange.start <= exportRange.end
    ? daysBetweenInclusive(exportRange.start, exportRange.end)
    : 0;
  const exportFilterSummary = `${exportRange.start || 'Start'} → ${exportRange.end || 'End'} · ${exportFilters.categoryMode === 'all' ? 'All tags' : `${exportFilters.selectedCategoryIds.length} tag${exportFilters.selectedCategoryIds.length === 1 ? '' : 's'}`} · ${exportFilters.projectId === 'all' ? 'All projects' : sortedProjects.find(p => p.id === exportFilters.projectId)?.name ?? 'Project'}`;

  const targetedExportDays = useMemo(() => {
    if (!exportRange.start || !exportRange.end || exportRange.start > exportRange.end) return [];
    const eventMap = new Map<string, Event[]>();
    exportFilteredEvents.forEach(event => {
      const dateEvents = eventMap.get(event.date) ?? [];
      dateEvents.push(event);
      eventMap.set(event.date, dateEvents);
    });
    eventMap.forEach(dateEvents => dateEvents.sort(sortEventsForCell));

    return getDatesInRange(exportRange.start, exportRange.end).map(date => {
      const dateObj = parseISODate(date);
      return {
        date,
        label: `${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}`,
        weekday: DOW_SHORT[dateObj.getDay()],
        events: eventMap.get(date) ?? [],
      };
    });
  }, [exportFilteredEvents, exportRange.end, exportRange.start, sortEventsForCell]);

  const targetedExportWeeks = useMemo(() => {
    if (!targetedExportDays.length) return [];
    const leadingBlanks = parseISODate(targetedExportDays[0].date).getDay();
    const cells: (typeof targetedExportDays[number] | null)[] = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...targetedExportDays,
    ];
    while (cells.length % TARGETED_EXPORT_COLS !== 0) cells.push(null);
    const weeks: (typeof targetedExportDays[number] | null)[][] = [];
    for (let i = 0; i < cells.length; i += TARGETED_EXPORT_COLS) {
      weeks.push(cells.slice(i, i + TARGETED_EXPORT_COLS));
    }
    return weeks;
  }, [targetedExportDays]);

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

  const exportFileName = `lifegrid-${activeCalendar?.name ?? 'calendar'}-${year}.png`.replace(/\s+/g, '-');

  // ── Image export (html-to-image renders modern CSS correctly) ──
  // iPhone Safari ignores <a download> for data-URLs, so instead of a silent
  // download we render the PNG and show it in an in-app preview the user can
  // save (long-press) or share via the native share sheet.
  const handleExport = useCallback(async () => {
    const container = scrollRef.current;
    if (!container) return;
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) {
      toast.error('Choose a valid export date range.', { id: 'export' });
      return;
    }
    if (!isTargetedDateExport && (!start.startsWith(`${year}-`) || !end.startsWith(`${year}-`))) {
      toast.error(`Full selected year export uses the selected ${year} grid. Choose a targeted range for other dates.`, { id: 'export' });
      return;
    }
    if (exportFilters.categoryMode === 'selected' && exportFilters.selectedCategoryIds.length === 0) {
      toast.error('Select at least one tag/category, or switch back to all tags.', { id: 'export' });
      return;
    }
    if (exportFilteredEvents.length === 0 && !isDefaultExportFilter) {
      toast.error('No events match those image export filters.', { id: 'export' });
      return;
    }
    if (isTargetedDateExport && exportDayCount > TARGETED_EXPORT_MAX_DAYS) {
      toast.error(`Targeted image export supports up to ${TARGETED_EXPORT_MAX_DAYS} days. Use Full selected year for longer ranges.`, { id: 'export' });
      return;
    }
    setExporting(true);
    toast.loading('Creating grid image…', { id: 'export' });

    const prevOverflow = container.style.overflow;
    const prevW = container.style.width;
    const prevH = container.style.height;
    const useTargetedLayout = isTargetedDateExport;

    if (!useTargetedLayout) {
      container.style.overflow = 'visible';
    }

    await new Promise(requestAnimationFrame);

    const captureNode = useTargetedLayout ? targetedExportRef.current : tableRef.current;
    if (!captureNode) {
      toast.error('Export failed — try again', { id: 'export' });
      setExporting(false);
      return;
    }

    if (!useTargetedLayout) {
      container.style.width  = captureNode.scrollWidth + 'px';
      container.style.height = captureNode.scrollHeight + 'px';
    }

    await new Promise(requestAnimationFrame);

    const opts = {
      pixelRatio: exportPixelRatio,
      backgroundColor: theme === 'dark' ? '#0d1526' : '#ffffff',
      width: captureNode.scrollWidth,
      height: captureNode.scrollHeight,
      cacheBust: true,
    };

    try {
      // Safari frequently renders a blank/partial image on the first pass
      // (fonts/styles not yet inlined). Rendering a few times fixes it.
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      let dataUrl = await toPng(captureNode, opts);
      if (isSafari) {
        await toPng(captureNode, opts);
        dataUrl = await toPng(captureNode, opts);
      }

      // Try the native share sheet first (best path on iOS — "Save Image").
      let shared = false;
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], exportFileName, { type: 'image/png' });
        const nav = navigator as any;
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: 'LifeGrid', text: 'My LifeGrid calendar' });
          shared = true;
        }
      } catch { /* user cancelled or share unsupported — fall through to preview */ }

      if (shared) {
        toast.success('Grid image ready to share!', { id: 'export' });
      } else {
        setExportUrl(dataUrl);
        toast.success('Grid image ready — save or share it', { id: 'export' });
      }
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Export failed — try again', { id: 'export' });
    } finally {
      container.style.overflow = prevOverflow;
      container.style.width    = prevW;
      container.style.height   = prevH;
      setExporting(false);
    }
  }, [theme, exportFileName, exportPixelRatio, exportDayCount, exportFilteredEvents.length, exportFilters.categoryMode, exportFilters.selectedCategoryIds.length, getExportDateRange, isDefaultExportFilter, isTargetedDateExport, year]);

  const downloadExport = () => {
    if (!exportUrl) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = exportFileName;
    a.click();
  };

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

        {/* Compact grid image export controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-muted-foreground transition-colors disabled:opacity-50"
            data-testid="button-export"
            title="Create grid image"
          >
            <Image size={12} />
            {exporting ? 'Working…' : 'Create Grid Image'}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => setExportOptionsOpen(open => !open)}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${exportOptionsOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
            title="Choose image export range and filters"
            data-testid="button-export-options"
          >
            Options
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
          data-testid="button-theme-toggle"
          title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {exportOptionsOpen && (
        <div className="flex-none border-b border-border bg-card/95 px-3 py-3 space-y-3" data-testid="panel-export-options">
          <div className="space-y-1">
            <div className="text-xs font-bold text-foreground">Export Grid Image</div>
            <div className="text-[11px] text-muted-foreground">Creates a readable grid image from the selected date range and filters. Notes are not included.</div>
            <div className="text-[11px] text-muted-foreground">{exportFilterSummary}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Date range</div>
              <div className="flex flex-wrap gap-1">
                {[
                  ['current', 'Full selected year'],
                  ['next7', 'Next 7'],
                  ['next14', 'Next 14'],
                  ['next30', 'Next 30'],
                  ['custom', 'Custom'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDatePreset(id as ExportDatePreset)}
                    className={`rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${exportFilters.datePreset === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {exportFilters.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={exportFilters.customStart}
                    onChange={e => setExportFilters(prev => ({ ...prev, customStart: e.target.value }))}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    data-testid="input-export-start"
                  />
                  <input
                    type="date"
                    value={exportFilters.customEnd}
                    onChange={e => setExportFilters(prev => ({ ...prev, customEnd: e.target.value }))}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    data-testid="input-export-end"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Tags / categories</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setExportFilters(prev => ({ ...prev, categoryMode: 'all', selectedCategoryIds: [] }))}
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${exportFilters.categoryMode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleExportCategory(category.id)}
                    className={`rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${exportFilters.categoryMode === 'selected' && selectedCategorySet.has(category.id) ? 'text-white' : 'bg-muted text-muted-foreground'}`}
                    style={exportFilters.categoryMode === 'selected' && selectedCategorySet.has(category.id) ? { backgroundColor: category.color } : undefined}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Project</div>
              <select
                value={exportFilters.projectId}
                onChange={e => setExportFilters(prev => ({ ...prev, projectId: e.target.value }))}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                data-testid="select-export-project"
              >
                <option value="all">All projects</option>
                {sortedProjects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Project focus includes events linked to tasks in that project.
              </p>
            </div>
          </div>
        </div>
      )}

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
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const isExpandedExport = exporting;
              const rowEventMax = MONTHS.reduce((max, _, mIdx) => {
                const maxDay = getDaysForMonth(mIdx);
                if (day > maxDay) return max;
                const dateStr = `${year}-${String(mIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                return Math.max(max, gridData.get(dateStr)?.length ?? 0);
              }, 0);
              const rowHeight = isExpandedExport ? Math.max(ROW_H, EXPORT_ROW_BASE_H + rowEventMax * (EVENT_PILL_H + 1)) : ROW_H;
              return (
              <tr key={day} style={{ height: rowHeight }}>
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
                  const visEvents = isExpandedExport ? dayEvents : dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                  const overflow  = isExpandedExport ? 0 : Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS);

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
                        height: rowHeight,
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

                      <div className={isExpandedExport ? 'flex flex-col gap-px' : 'flex flex-col gap-px overflow-hidden'}>
                        {visEvents.map(evt => (
                          <div
                            key={evt.id}
                            className="rounded-sm px-1 flex items-center gap-0.5 overflow-hidden transition-opacity"
                            style={{
                              backgroundColor: evt.color,
                              height: isExpandedExport ? EVENT_PILL_H : 10,
                              opacity: dim(evt.category) ? 0.18 : 1,
                            }}
                            data-testid={`event-pill-${evt.id}`}
                          >
                            {evt.startTime && (
                              <span className="text-white/80 shrink-0 tabular-nums" style={{ fontSize: 7, lineHeight: 1 }}>
                                {evt.startTime}
                              </span>
                            )}
                            <span className="text-white font-semibold truncate" style={{ fontSize: 8, lineHeight: 1 }}>
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
            );})}
          </tbody>
        </table>
      </div>

      {exporting && isTargetedDateExport && (
        <div
          ref={targetedExportRef}
          className="fixed top-0 -left-[10000px] bg-background text-foreground"
          style={{ width: 1120, padding: 28 }}
          data-testid="targeted-export-grid"
        >
          <div className="mb-5 flex items-end justify-between gap-6 border-b border-border pb-4">
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{activeCalendar?.name ?? 'LifeGrid'} grid image</div>
              <div className="mt-1 text-sm font-semibold text-muted-foreground">{exportRange.start} → {exportRange.end} · {exportDayCount} day{exportDayCount === 1 ? '' : 's'}</div>
            </div>
            <div className="text-right text-xs font-semibold text-muted-foreground">
              <div>{exportFilters.categoryMode === 'all' ? 'All tags' : `${exportFilters.selectedCategoryIds.length} selected tag${exportFilters.selectedCategoryIds.length === 1 ? '' : 's'}`}</div>
              <div>{exportFilters.projectId === 'all' ? 'All projects' : sortedProjects.find(p => p.id === exportFilters.projectId)?.name ?? 'Project focus'}</div>
            </div>
          </div>

          <table className="w-full table-fixed border-collapse overflow-hidden rounded-xl border border-border bg-background">
            <thead>
              <tr>
                {DOW_SHORT.map(day => (
                  <th key={day} className="border-b border-r border-border bg-card px-2 py-2 text-left text-xs font-extrabold uppercase tracking-widest text-muted-foreground last:border-r-0">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targetedExportWeeks.map((week, weekIdx) => {
                const weekMax = Math.max(0, ...week.map(day => day?.events.length ?? 0));
                const expandedCellHeight = Math.max(124, 54 + weekMax * 20);
                const cellHeight = expandedCellHeight;
                return (
                  <tr key={weekIdx}>
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        return (
                          <td
                            key={`blank-${weekIdx}-${dayIdx}`}
                            className="border-b border-r border-border bg-muted/25 align-top last:border-r-0"
                            style={{ height: cellHeight }}
                          />
                        );
                      }
                      const visibleEvents = day.events;
                      const overflow = 0;
                      return (
                        <td
                          key={day.date}
                          className="border-b border-r border-border align-top last:border-r-0"
                          style={{ height: cellHeight, padding: 8 }}
                        >
                          <div className="mb-2.5 flex items-baseline justify-between gap-2">
                            <span className="text-sm font-extrabold text-foreground">{day.label}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{day.weekday}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {visibleEvents.map(evt => (
                              <div
                                key={evt.id}
                                className="flex items-center gap-1.5 overflow-hidden rounded-md px-2 py-1.5 shadow-sm"
                                style={{ backgroundColor: evt.color }}
                              >
                                {evt.startTime && (
                                  <span className="shrink-0 tabular-nums text-white/80" style={{ fontSize: 11, lineHeight: 1.1 }}>
                                    {evt.startTime}
                                  </span>
                                )}
                                <span className="truncate font-bold text-white" style={{ fontSize: 11, lineHeight: 1.1 }}>
                                  {evt.title}
                                </span>
                              </div>
                            ))}
                            {overflow > 0 && (
                              <div className="px-1 text-[9px] font-bold text-muted-foreground">+{overflow} more</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Export image preview — iPhone-friendly (long-press to save) */}
      {exportUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col"
          onClick={() => setExportUrl(null)}
          data-testid="export-preview"
        >
          <div className="flex-none px-4 py-3 flex items-center justify-between text-white">
            <span className="text-sm font-semibold">Your grid image</span>
            <button
              onClick={() => setExportUrl(null)}
              className="p-1.5 rounded-lg hover:bg-white/10"
              data-testid="button-export-close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-4 flex items-start justify-center" onClick={e => e.stopPropagation()}>
            <img src={exportUrl} alt="LifeGrid calendar export" className="max-w-full rounded-lg shadow-2xl" />
          </div>
          <div className="flex-none p-4 space-y-2" onClick={e => e.stopPropagation()}>
            <p className="text-center text-[11px] text-white/70">
              On iPhone: press and hold the image, then “Save Image”.
            </p>
            <Button onClick={downloadExport} className="w-full gap-2 h-11" data-testid="button-export-download">
              <Download size={16} /> Download image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
