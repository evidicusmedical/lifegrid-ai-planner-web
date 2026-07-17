import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useTheme } from '../context/ThemeContext';
import { Event, Project, Task } from '../types';
import { ChevronLeft, ChevronRight, Sun, Moon, Image, Plus, Check, ChevronDown, X, Download, MessageSquareText } from 'lucide-react';
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
import { DayTypePreview } from '../components/DayTypePreview';
import { buildExportLegend, buildExportMetadata, EXPORT_DENSITY, ExportDensity, getDenseDay, getExportDimensions } from '../lib/gridPublication';
import { getDateTemporalState, truncatePreviewNote, validateExportRange } from '../lib/gridAwareness';
import { getDisplayedTemporalOccurrence } from '../lib/temporal';

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

const ExportPublicationHeader = ({ metadata, legend }: { metadata: { title: string; subtitle: string; metadata: string[] }; legend: { id: string; label: string; color: string }[] }) => (
  <header className="mb-5 border-b border-border pb-4" data-testid="export-publication-header">
    <h1 className="text-2xl font-extrabold tracking-tight">{metadata.title}</h1>
    {metadata.subtitle && <p className="mt-1 text-sm text-muted-foreground">{metadata.subtitle}</p>}
    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">{metadata.metadata.map(item => <p key={item}>{item}</p>)}</div>
    <section className="mt-4 border-t border-border pt-3" aria-label="Categories"><p className="text-xs font-bold">Categories</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">{legend.map(entry => <span key={entry.id} className="inline-flex items-center gap-1.5 text-xs font-medium"><span className="h-3 w-3 rounded-sm border border-black/10" style={{ backgroundColor: entry.color }} />{entry.label}</span>)}</div></section>
  </header>
);

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
  const [exportPixelRatio, setExportPixelRatio] = useState(1);
  const [exportMode, setExportMode] = useState<'expanded' | 'visible'>('expanded');
  const [exportDensity, setExportDensity] = useState<ExportDensity>('compact');
  const [customExportTitle, setCustomExportTitle] = useState('');
  const [customExportSubtitle, setCustomExportSubtitle] = useState('');
  const [includeGeneratedAt, setIncludeGeneratedAt] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<{ event: Event; date: string; anchor: DOMRect } | null>(null);
  const [focusedCats, setFocusedCats] = useState<Set<string>>(new Set());
  const [exportFilters, setExportFilters] = useState<GridExportFilters>({
    datePreset: 'current',
    customStart: '',
    customEnd: '',
    categoryMode: 'all',
    selectedCategoryIds: [],
    projectId: 'all',
  });
  const [exportOptionsOpen, setExportOptionsOpen] = useState(false);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLTableElement>(null);
  const targetedExportRef = useRef<HTMLDivElement>(null);
  const publicationRef = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<number | null>(null);
  const didScrollRef = useRef(false);

  const todayStr   = toISODate(today);
  const todayMonth = today.getMonth();
  const todayDay   = today.getDate();

  const getDaysForMonth = (m: number) => (m === 1 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[m]);

  const activeCalendar = calendars.find(c => c.id === activeCalendarId)!;
  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setClockNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  const clockFor = (zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).format(clockNow);

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

  const sortEventsForCell = useCallback((a: Event, b: Event) => {
    const byPriority = (a.displayPriority ?? 4) - (b.displayPriority ?? 4);
    if (byPriority !== 0) return byPriority;
    const aDisplayed = getDisplayedTemporalOccurrence(a, activeCalendar.displayTimeZone);
    const bDisplayed = getDisplayedTemporalOccurrence(b, activeCalendar.displayTimeZone);
    const aAllDay = !aDisplayed.displayedStartTime;
    const bAllDay = !bDisplayed.displayedStartTime;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    if (!aAllDay && !bAllDay) {
      const byTime = (aDisplayed.displayedStartTime ?? '').localeCompare(bDisplayed.displayedStartTime ?? '');
      if (byTime !== 0) return byTime;
    }
    const byCat = (categoryRank.get(a.category) ?? 999) - (categoryRank.get(b.category) ?? 999);
    if (byCat !== 0) return byCat;
    return a.title.localeCompare(b.title);
  }, [categoryRank, activeCalendar.displayTimeZone]);

  const isTargetedDateExport = useMemo(() => {
    if (exportFilters.datePreset === 'current') return false;
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) return false;
    return daysBetweenInclusive(start, end) <= TARGETED_EXPORT_MAX_DAYS;
  }, [exportFilters.datePreset, getExportDateRange]);

  const targetedExportWeeks = useMemo(() => {
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) return [];
    const dates = getDatesInRange(start, end);
    const startDow = parseISODate(start).getDay();
    const filteredByDate = new Map<string, Event[]>();
    exportFilteredEvents.forEach(e => {
      const displayed = getDisplayedTemporalOccurrence(e, activeCalendar.displayTimeZone);
      const arr = filteredByDate.get(displayed.displayedStartDate) ?? [];
      arr.push(e);
      filteredByDate.set(displayed.displayedStartDate, arr);
    });
    filteredByDate.forEach(arr => arr.sort(sortEventsForCell));
    const days = dates.map(date => {
      const d = parseISODate(date);
      return { date, label: String(d.getDate()), weekday: DOW_SHORT[d.getDay()], events: filteredByDate.get(date) ?? [] };
    });
    const padded: (typeof days[0] | null)[] = [...Array(startDow).fill(null), ...days];
    const weeks: (typeof days[0] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [exportFilteredEvents, getExportDateRange, sortEventsForCell, activeCalendar.displayTimeZone]);

  const eventsForGrid = exporting ? exportFilteredEvents.filter(event => event.showInExport !== false) : events;

  const gridData = useMemo(() => {
    const map = new Map<string, Event[]>();
    eventsForGrid.forEach(e => {
      const displayed = getDisplayedTemporalOccurrence(e, activeCalendar.displayTimeZone);
      const arr = map.get(displayed.displayedStartDate) ?? [];
      arr.push(e);
      map.set(displayed.displayedStartDate, arr);
    });
    map.forEach(arr => arr.sort(sortEventsForCell));
    return map;
  }, [eventsForGrid, sortEventsForCell, activeCalendar.displayTimeZone]);

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
  const resetExportRange = () => setExportFilters(prev => ({ ...prev, datePreset: 'current', customStart: '', customEnd: '' }));

  const toggleExportCategory = (id: string) => {
    setExportFilters(prev => {
      const selected = new Set(prev.selectedCategoryIds);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      return { ...prev, categoryMode: 'selected', selectedCategoryIds: Array.from(selected) };
    });
  };

  const exportRange = getExportDateRange();
  // Validation is derived on every render, so corrected inputs, presets, calendar/year changes,
  // and reopening the options panel can never retain a stale disabled/error state.
  const exportRangeError = validateExportRange(exportRange, year);
  const isDefaultExportFilter =
    exportFilters.datePreset === 'current' &&
    exportFilters.categoryMode === 'all' &&
    exportFilters.projectId === 'all';
  const exportFilterSummary = `${exportRange.start || 'Start'} → ${exportRange.end || 'End'} · ${exportFilters.categoryMode === 'all' ? 'All tags' : `${exportFilters.selectedCategoryIds.length} tag${exportFilters.selectedCategoryIds.length === 1 ? '' : 's'}`} · ${exportFilters.projectId === 'all' ? 'All projects' : sortedProjects.find(p => p.id === exportFilters.projectId)?.name ?? 'Project'}`;

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

  const exportFileName = `lifegrid-${activeCalendar?.name ?? 'calendar'}-${exportRange.start || year}-${exportRange.end || year}.png`.replace(/\s+/g, '-');
  const exportLegend = useMemo(() => buildExportLegend(exportFilteredEvents, categories), [exportFilteredEvents, categories]);
  const exportMetadata = useMemo(() => buildExportMetadata({ calendarName: activeCalendar?.name ?? 'LifeGrid', start: exportRange.start, end: exportRange.end, timeZone: activeCalendar?.displayTimeZone ?? 'UTC', customTitle: customExportTitle, customSubtitle: customExportSubtitle, generatedAt: includeGeneratedAt ? new Date() : null }), [activeCalendar, customExportTitle, customExportSubtitle, exportRange.end, exportRange.start, includeGeneratedAt]);
  const exportDimensions = getExportDimensions(exportDensity, exportLegend.entries.length, isTargetedDateExport);

  // ── Image export (html-to-image renders modern CSS correctly) ──
  // iPhone Safari ignores <a download> for data-URLs, so instead of a silent
  // download we render the PNG and show it in an in-app preview the user can
  // save (long-press) or share via the native share sheet.
  const handleExport = useCallback(async () => {
    const container = scrollRef.current;
    if (!tableRef.current || !container) return;
    const { start, end } = getExportDateRange();
    const rangeError = validateExportRange({ start, end }, year);
    if (rangeError) {
      toast.error(rangeError, { id: 'export' });
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
    setExporting(true);
    toast.loading(`Generating ${exportMode === 'expanded' ? 'expanded' : 'visible'} ${exportPixelRatio === 1 ? 'compact' : 'sharp'} grid image…`, { id: 'export' });

    const prevOverflow = container.style.overflow;
    const prevW = container.style.width;
    const prevH = container.style.height;
    const useTargetedLayout = isTargetedDateExport;

    if (!useTargetedLayout) {
      container.style.overflow = 'visible';
    }

    await new Promise(requestAnimationFrame);

    const captureNode = useTargetedLayout ? targetedExportRef.current : publicationRef.current;
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
      pixelRatio: exportPixelRatio * EXPORT_DENSITY[exportDensity].pixelRatio,
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
  }, [theme, exportFileName, exportPixelRatio, exportMode, exportDensity, exportFilters, exportFilteredEvents.length, getExportDateRange, isDefaultExportFilter, isTargetedDateExport, year]);

  const downloadExport = () => {
    if (!exportUrl) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = exportFileName;
    a.click();
  };

  const openAdd = (date: string) => { setEditEvent(null); setAddDate(date); setDetailDate(null); setEventSheetOpen(true); };
  const openEdit = (evt: Event) => { setEditEvent(evt); setAddDate(null); setDetailDate(null); setEventSheetOpen(true); };


  return (
    <div className="flex flex-col h-full bg-background relative">

      {/* ── Header bar ── */}
      <div className="flex-none relative px-3 py-2 flex items-center gap-3 border-b border-border bg-card">
        {/* Calendar version switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 min-w-0 max-w-[min(20rem,38vw)] text-left" title={activeCalendar?.name ?? 'LifeGrid'}
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
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 ml-3">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-prev">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold px-1.5 min-w-[3rem] text-center tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded hover:bg-background transition-colors" data-testid="button-year-next">
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Compact grid image export controls */}
        <div className="flex items-center gap-1">
          <div className="hidden md:flex items-center rounded-lg bg-muted p-0.5">
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportMode('visible')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors disabled:opacity-50 ${exportMode === 'visible' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              title="Export the grid as currently visible, with overflow indicators"
            >
              Visible
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportMode('expanded')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors disabled:opacity-50 ${exportMode === 'expanded' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              title="Expand rows during export to include all events"
            >
              Expanded
            </button>
          </div>
          <div className="hidden sm:flex items-center rounded-lg bg-muted p-0.5">
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportPixelRatio(1)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors disabled:opacity-50 ${exportPixelRatio === 1 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              Fast
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportPixelRatio(2)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors disabled:opacity-50 ${exportPixelRatio === 2 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              Sharp
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExportOptionsOpen(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${exportOptionsOpen ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            title="Export filter options"
            data-testid="button-export-options"
          >
            Filters <ChevronDown size={10} className={`transition-transform ${exportOptionsOpen ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !!exportRangeError}
            aria-describedby={exportRangeError ? 'export-range-error' : undefined}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-muted-foreground transition-colors disabled:opacity-50"
            data-testid="button-export"
            title="Create grid image"
          >
            <Image size={12} />
            {exporting ? 'Working…' : `Export ${exportMode === 'expanded' ? 'Expanded' : 'Visible'}`}
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
          <button
            type="button"
            disabled={exporting}
            onClick={() => setExportMode(exportMode === 'expanded' ? 'visible' : 'expanded')}
            className="md:hidden px-2 py-1.5 rounded-lg text-[10px] font-bold bg-muted text-muted-foreground disabled:opacity-50"
            title="Toggle export mode"
          >
            {exportMode === 'expanded' ? 'Expanded' : 'Visible'}
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
          <div>
            <div className="text-xs font-bold text-foreground">Image export filters</div>
            <div className="text-[11px] text-muted-foreground">{exportFilterSummary}</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold">Export density<select value={exportDensity} onChange={e => setExportDensity(e.target.value as ExportDensity)} className="mt-1 block h-8 w-full rounded border border-border bg-background px-2 text-xs"><option value="compact">Compact</option><option value="detailed">Detailed</option></select></label>
            <label className="text-xs font-semibold">Custom title<input value={customExportTitle} maxLength={120} onChange={e => setCustomExportTitle(e.target.value)} className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-xs" /></label>
            <label className="text-xs font-semibold">Custom subtitle<input value={customExportSubtitle} maxLength={180} onChange={e => setCustomExportSubtitle(e.target.value)} className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-xs" /></label>
            <label className="flex items-center gap-2 self-end pb-1 text-xs font-semibold"><input type="checkbox" checked={includeGeneratedAt} onChange={e => setIncludeGeneratedAt(e.target.checked)} /> Include generated timestamp</label>
          </div>
          <p className="text-[11px] text-muted-foreground" role="status">Preview: {exportMetadata.title} · {exportLegend.recordCount} records · {exportLegend.entries.length} categories · approximately {exportDimensions.width} × {exportDimensions.height}px. Detailed exports use larger dimensions.</p>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Date range</div>
              <div className="flex flex-wrap gap-1">
                {[
                  ['current', 'Current grid'],
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
              {exportRangeError && <p id="export-range-error" role="alert" className="text-[10px] font-medium text-destructive">{exportRangeError}</p>}
              <button type="button" onClick={resetExportRange} className="text-[10px] font-bold text-primary hover:underline">Reset Export Range</button>
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
          <p className="text-[10px] leading-snug text-muted-foreground pt-1">
            Creates a readable grid image from the selected date range and filters. Notes are not included.
          </p>
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
        <div ref={publicationRef} className={exporting ? "lifegrid-export-publication bg-background p-6" : undefined} style={exporting ? { minWidth: exportDimensions.width, padding: EXPORT_DENSITY[exportDensity].padding } : undefined}>
        {exporting && <ExportPublicationHeader metadata={exportMetadata} legend={exportLegend.entries} />}
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
              const isExpandedExport = exporting && exportMode === 'expanded';
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
                  const temporal = getDateTemporalState(dateStr, todayStr, detailDate);
                  const isToday = temporal.isToday;

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
                  const denseDay = getDenseDay(dayEvents, exporting ? EXPORT_DENSITY[exportDensity].cellLimit : MAX_VISIBLE_EVENTS);
                  const visEvents = isExpandedExport ? dayEvents : denseDay.visible;
                  const overflow = isExpandedExport ? 0 : denseDay.overflow;

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
                      className={`border-b border-r border-border cursor-pointer select-none relative align-top ${temporal.isPast ? 'opacity-70' : ''} ${temporal.isSelected ? 'ring-2 ring-inset ring-foreground/70' : ''} ${isToday ? 'ring-2 ring-inset ring-primary' : ''} focus-within:ring-2 focus-within:ring-inset focus-within:ring-foreground`}
                      style={{
                        width: MONTH_COL_W, minWidth: MONTH_COL_W, height: rowHeight,
                        background: temporal.isPast ? (theme === 'dark' ? 'rgba(71,85,105,0.18)' : 'rgba(148,163,184,0.13)') : cellBg,
                        padding: '2px 3px',
                      }}
                      onClick={() => setDetailDate(dateStr)}
                      aria-label={`${dateStr}${isToday ? ', Today' : ''}${temporal.isPast ? ', past date' : ''}${temporal.isSelected ? ', selected' : ''}`}
                      data-testid={`cell-${dateStr}`}
                    >
                      {isToday && <><div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" /><span className="sr-only">Today</span></>}
                      {temporal.isSelected && <span className="sr-only">Selected date</span>}

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
                            className="rounded-sm px-1 flex items-center gap-0.5 overflow-hidden transition-opacity focus:outline-none focus:ring-1 focus:ring-white"
                            tabIndex={0}
                            title={`${evt.title}${evt.eventKind ? ` · ${evt.eventKind}` : ''}${evt.startTime ? ` · ${evt.startTime}${evt.endTime ? `–${evt.endTime}` : ''}` : ''}${evt.notes ? ` · ${truncatePreviewNote(evt.notes)}` : ''}`}
                            aria-label={`${evt.title}${evt.notes ? `. Notes: ${truncatePreviewNote(evt.notes)}` : ''}. Press Enter to open date details.`}
                            onClick={e => { e.stopPropagation(); setDetailDate(dateStr); }}
                            onPointerEnter={e => { if (evt.eventKind === 'day-type' && window.matchMedia('(hover: hover)').matches) { previewTimerRef.current = window.setTimeout(() => setPreviewEvent({ event: evt, date: dateStr, anchor: e.currentTarget.getBoundingClientRect() }), 250); } }}
                            onPointerLeave={() => { if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current); }}
                            onFocus={e => { if (evt.eventKind === 'day-type') setPreviewEvent({ event: evt, date: dateStr, anchor: e.currentTarget.getBoundingClientRect() }); }}
                            aria-describedby={previewEvent?.event.id === evt.id ? `day-type-preview-${evt.id}` : undefined}
                            onKeyDown={e => { if (e.key === 'Escape') { setPreviewEvent(null); e.currentTarget.focus(); } if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailDate(dateStr); } }}
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
                            {evt.notes?.trim() && <MessageSquareText aria-label="Has notes" className="ml-auto shrink-0 text-white" size={7} />}
                          </div>
                        ))}

                        {overflow > 0 && (
                          <button type="button" onClick={e => { e.stopPropagation(); setDetailDate(dateStr); }} aria-label={denseDay.overflowLabel}
                            className="text-[7px] font-bold px-1 text-left"
                            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', lineHeight: 1 }}
                          >
                            +{overflow} more
                          </button>
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
      </div>

      {exporting && isTargetedDateExport && (
        <div
          ref={targetedExportRef}
          className="fixed top-0 -left-[10000px] bg-background text-foreground"
          style={{ width: exportDimensions.width, padding: EXPORT_DENSITY[exportDensity].padding }}
          data-testid="targeted-export-grid"
        >
          <ExportPublicationHeader metadata={exportMetadata} legend={exportLegend.entries} />

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
                const expandedCellHeight = Math.max(112, 48 + weekMax * 18);
                const cellHeight = exportMode === 'expanded' ? expandedCellHeight : 116;
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
                      const visibleEvents = exportMode === 'expanded' ? day.events : day.events.slice(0, MAX_VISIBLE_EVENTS);
                      const overflow = exportMode === 'expanded' ? 0 : Math.max(0, day.events.length - MAX_VISIBLE_EVENTS);
                      return (
                        <td
                          key={day.date}
                          className="border-b border-r border-border align-top last:border-r-0"
                          style={{ height: cellHeight, padding: 6 }}
                        >
                          <div className="mb-2 flex items-baseline justify-between gap-2">
                            <span className="text-sm font-extrabold text-foreground">{day.label}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{day.weekday}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {visibleEvents.map(evt => (
                              <div
                                key={evt.id}
                                className="flex items-center gap-1 overflow-hidden rounded-md px-1.5 py-1"
                                style={{ backgroundColor: evt.color }}
                              >
                                {evt.startTime && (
                                  <span className="shrink-0 tabular-nums text-white/80" style={{ fontSize: 9, lineHeight: 1.1 }}>
                                    {evt.startTime}
                                  </span>
                                )}
                                <span className="truncate font-bold text-white" style={{ fontSize: 10, lineHeight: 1.1 }}>
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

      <DayTypePreview event={previewEvent?.event ?? null} date={previewEvent?.date ?? todayStr} category={categories.find(category => category.id === previewEvent?.event.category)?.label ?? "Other"} anchor={previewEvent?.anchor ?? null} onClose={() => setPreviewEvent(null)} onDetails={() => { setDetailDate(previewEvent?.date ?? null); setPreviewEvent(null); }} onEdit={() => { if (previewEvent) openEdit(previewEvent.event); setPreviewEvent(null); }} />

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
