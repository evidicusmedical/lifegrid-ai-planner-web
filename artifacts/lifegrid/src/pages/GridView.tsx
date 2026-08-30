import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useAppData } from "../context/AppDataContext";
import { useTheme } from "../context/ThemeContext";
import { Event, Project, Task } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Image,
  Plus,
  Check,
  ChevronDown,
  X,
  Download,
  Share2,
} from "lucide-react";
import { EventSheet } from "../components/EventSheet";
import { DayDetailSheet } from "../components/DayDetailSheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toISODate } from "../lib/format";
import { DayTypePreview } from "../components/DayTypePreview";
import {
  buildExportLegend,
  buildExportMetadata,
  EXPORT_DENSITY,
  getDenseDay,
  getExportDimensions,
} from "../lib/gridPublication";
import {
  getDateTemporalState,
  filterEventsForGridExport,
  resolveExportDateRange,
  validateExportRange,
} from "../lib/gridAwareness";
import { getLocalTemporalOccurrence } from "../lib/temporal";
import { buildGridWindowViewModel, expandEventsToDateBuckets, filterGridEventsByCategories, resolveEventById, type GridEventSummary } from "../lib/gridModel";
import { addCalendarMonths, buildMonthWindow, monthWindowDateRange, resolveAddEventDefaultDate } from "../lib/gridWindow";
import { planGridPublication } from "../lib/gridPublicationPlan";
import { getPublicationCaptureBounds } from "../lib/gridPublicationText";
import { GRID_DAY_COLUMN_WIDTH, GRID_MONTH_COLUMN_WIDTH, PUBLICATION_HORIZONTAL_PADDING, getMonthPublicationWidth, getMonthTableWidth } from "../lib/gridPublicationGeometry";
import { gridMark } from "../lib/gridDiagnostics";
import { getReadableTextColor } from "../lib/palette";
import { renderGridPng, type GridImageRendererName } from "../lib/gridImageRenderer";
// gridMark is gated by import.meta.env.DEV in gridDiagnostics.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const isLeapYear = (y: number) =>
  (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const DAY_COL_W = GRID_DAY_COLUMN_WIDTH;
const MONTH_COL_W = GRID_MONTH_COLUMN_WIDTH;
const ROW_H = 52;
const HEADER_H = 44;
const MAX_VISIBLE_EVENTS = 5;
const EVENT_PILL_H = 10;
const EXPORT_ROW_BASE_H = 16;
const TARGETED_EXPORT_MAX_DAYS = 45;
const TARGETED_EXPORT_COLS = 7;

type ExportDatePreset = "currentGrid" | "calendarYear" | "q1" | "q2" | "q3" | "q4" | "next7" | "next14" | "next30" | "custom";
type ExportProjectFilter = "all" | string;

interface GridExportFilters {
  datePreset: ExportDatePreset;
  customStart: string;
  customEnd: string;
  categoryMode: "all" | "selected";
  selectedCategoryIds: string[];
  projectId: ExportProjectFilter;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseISODate = (value: string) => {
  const [yearPart, monthPart, dayPart] = value.split("-").map(Number);
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

const getEventProjectIds = (
  event: Event,
  taskById: Map<string, Task>,
  tasksByLinkedEvent: Map<string, Task[]>,
) => {
  const projectIds = new Set<string>();
  if (event.projectId) projectIds.add(event.projectId);
  event.linkedTaskIds.forEach((taskId) => {
    const task = taskById.get(taskId);
    if (task?.projectId) projectIds.add(task.projectId);
  });
  (tasksByLinkedEvent.get(event.id) ?? []).forEach((task) => {
    if (task.projectId) projectIds.add(task.projectId);
  });
  return projectIds;
};

const sortProjectsForExport = (a: Project, b: Project) => {
  const byOrder = a.order - b.order;
  if (byOrder !== 0) return byOrder;
  return a.name.localeCompare(b.name);
};

const ExportPublicationHeader = ({
  metadata,
  legend,
}: {
  metadata: { title: string; subtitle: string; metadata: string[] };
  legend: { id: string; label: string; color: string }[];
}) => (
  <header
    className="mb-5 border-b border-border pb-4"
    data-testid="export-publication-header"
  >
    <h1 className="text-2xl font-extrabold tracking-tight">{metadata.title}</h1>
    {metadata.subtitle && (
      <p className="mt-1 text-sm text-muted-foreground">{metadata.subtitle}</p>
    )}
    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
      {metadata.metadata.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
    <section
      className="mt-4 border-t border-border pt-3"
      aria-label="Categories"
    >
      <p className="text-xs font-bold">Categories</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
        {legend.map((entry) => (
          <span
            key={entry.id}
            className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap text-xs font-medium"
            data-publication-legend-entry="true"
          >
            <span
              className="h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: entry.color }}
            />
            {entry.label}
          </span>
        ))}
      </div>
    </section>
  </header>
);

export const GridView = () => {
  gridMark("lifegrid:grid-view-mounted");
  const {
    events,
    tasks,
    categories,
    projects,
    calendars,
    activeCalendarId,
    switchCalendar,
  } = useAppData();
  const { theme, toggleTheme } = useTheme();

  const today = useMemo(() => new Date(), []);
  const [viewStart, setViewStart] = useState({ year: today.getFullYear(), monthIndex: 0 });
  const year = viewStart.year;
  const displayedMonths = useMemo(() => buildMonthWindow(viewStart.year, viewStart.monthIndex), [viewStart]);
  const gridWindowRange = useMemo(() => monthWindowDateRange(displayedMonths), [displayedMonths]);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [exportRenderer, setExportRenderer] = useState<GridImageRendererName | null>(null);
  const [exportErrorCode, setExportErrorCode] = useState("");
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [customExportTitle, setCustomExportTitle] = useState("");
  const [customExportSubtitle, setCustomExportSubtitle] = useState("");
  const [includeGeneratedAt, setIncludeGeneratedAt] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<{
    event: Event;
    date: string;
    anchor: DOMRect;
  } | null>(null);
  const [focusedCats, setFocusedCats] = useState<Set<string>>(new Set());
  const [exportFilters, setExportFilters] = useState<GridExportFilters>({
    datePreset: "currentGrid",
    customStart: "",
    customEnd: "",
    categoryMode: "all",
    selectedCategoryIds: [],
    projectId: "all",
  });
  const [exportOptionsOpen, setExportOptionsOpen] = useState(false);
  const [compactExportLayout, setCompactExportLayout] = useState(false);
  const exportUiActive = exportOptionsOpen || exporting || exportUrl;
  // Yield once after the shell commits so route feedback paints before annual DOM work.
  const [gridReady, setGridReady] = useState(false);
  const [renderedMonths, setRenderedMonths] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportDialogRef = useRef<HTMLDivElement>(null);
  const exportBodyRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const targetedExportRef = useRef<HTMLDivElement>(null);
  const publicationRef = useRef<HTMLDivElement>(null);
  const previewOpenTimerRef = useRef<number | null>(null);
  const previewCloseTimerRef = useRef<number | null>(null);
  const eventPointerActivationRef = useRef(false);
  const eventPointerActivationResetRef = useRef<number | null>(null);
  const didScrollRef = useRef(false);
  const priorGridModelRef = useRef<
    ReturnType<typeof buildGridWindowViewModel> | undefined
  >(undefined);

  const cancelPreviewTimers = useCallback(() => {
    if (previewOpenTimerRef.current) window.clearTimeout(previewOpenTimerRef.current);
    if (previewCloseTimerRef.current) window.clearTimeout(previewCloseTimerRef.current);
    previewOpenTimerRef.current = previewCloseTimerRef.current = null;
  }, []);
  const finishEventPointerActivation = useCallback(() => {
    eventPointerActivationRef.current = false;
    if (eventPointerActivationResetRef.current !== null) {
      window.clearTimeout(eventPointerActivationResetRef.current);
      eventPointerActivationResetRef.current = null;
    }
  }, []);
  const beginEventPointerActivation = useCallback(() => {
    cancelPreviewTimers();
    setPreviewEvent(null);
    eventPointerActivationRef.current = true;
    if (eventPointerActivationResetRef.current !== null) {
      window.clearTimeout(eventPointerActivationResetRef.current);
    }
    eventPointerActivationResetRef.current = window.setTimeout(() => {
      eventPointerActivationRef.current = false;
      eventPointerActivationResetRef.current = null;
    }, 750);
  }, [cancelPreviewTimers]);
  const keepPreviewOpen = useCallback(() => {
    if (previewCloseTimerRef.current) window.clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);
  const schedulePreviewClose = useCallback(() => {
    if (previewOpenTimerRef.current) window.clearTimeout(previewOpenTimerRef.current);
    if (previewCloseTimerRef.current) window.clearTimeout(previewCloseTimerRef.current);
    previewOpenTimerRef.current = null;
    previewCloseTimerRef.current = window.setTimeout(() => setPreviewEvent(null), 180);
  }, []);
  const openDayDetail = useCallback((date: string) => {
    cancelPreviewTimers();
    setPreviewEvent(null);
    setDetailDate(date);
    setDayDetailOpen(true);
  }, [cancelPreviewTimers]);
  const closeDayDetail = useCallback(() => {
    setDayDetailOpen(false);
    setDetailDate(null);
  }, []);
  useEffect(() => () => {
    cancelPreviewTimers();
    finishEventPointerActivation();
  }, [cancelPreviewTimers, finishEventPointerActivation]);
  useEffect(() => {
    cancelPreviewTimers();
    setPreviewEvent(null);
    closeDayDetail();
  }, [activeCalendarId, viewStart, cancelPreviewTimers, closeDayDetail]);

  const todayStr = toISODate(today);
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const addEventDefaultDate = resolveAddEventDefaultDate(todayStr, gridWindowRange);

  const activeCalendar = calendars.find((c) => c.id === activeCalendarId)!;
  const categoryRank = useMemo(
    () => new Map(categories.map((c, idx) => [c.id, idx])),
    [categories],
  );
  const sortedProjects = useMemo(
    () => [...projects].sort(sortProjectsForExport),
    [projects],
  );

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const tasksByLinkedEvent = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      task.linkedEventIds.forEach((eventId) => {
        const linkedTasks = map.get(eventId) ?? [];
        linkedTasks.push(task);
        map.set(eventId, linkedTasks);
      });
    });
    return map;
  }, [tasks]);

  const getExportDateRange = useCallback(() => {
    return resolveExportDateRange(
      exportFilters.datePreset,
      gridWindowRange,
      year,
      todayStr,
      exportFilters.customStart,
      exportFilters.customEnd,
    );
  }, [
    exportFilters.customEnd,
    exportFilters.customStart,
    exportFilters.datePreset,
    todayStr,
    year,
    gridWindowRange,
  ]);

  const selectedCategorySet = useMemo(
    () => new Set(exportFilters.selectedCategoryIds),
    [exportFilters.selectedCategoryIds],
  );

  const exportFilteredEvents = useMemo(() => {
    if (!exportUiActive) return [];
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) return [];
    return filterEventsForGridExport(
      events,
      { start, end },
      exportFilters.categoryMode === "selected" ? selectedCategorySet : null,
      exportFilters.projectId === "all" ? null : exportFilters.projectId,
      event => getEventProjectIds(event, taskById, tasksByLinkedEvent),
    );
  }, [
    events,
    exportFilters.categoryMode,
    exportFilters.projectId,
    exportUiActive,
    getExportDateRange,
    selectedCategorySet,
    taskById,
    tasksByLinkedEvent,
  ]);

  const exportRange = getExportDateRange();
  const exportGridData = useMemo(() => expandEventsToDateBuckets(exportFilteredEvents, exportRange.start, exportRange.end, categoryRank), [exportFilteredEvents, exportRange.start, exportRange.end, categoryRank]);
  const exportMonths = useMemo(() => {
    if (!exportRange.start || !exportRange.end || exportRange.start > exportRange.end) return displayedMonths;
    const [startYear, startMonth] = exportRange.start.split("-").map(Number);
    const [endYear, endMonth] = exportRange.end.split("-").map(Number);
    return buildMonthWindow(startYear, startMonth - 1, (endYear - startYear) * 12 + endMonth - startMonth + 1);
  }, [displayedMonths, exportRange.start, exportRange.end]);
  const publicationPlan = useMemo(() => planGridPublication({ start: exportRange.start, end: exportRange.end, recordsByDate: exportGridData, monthCount: exportMonths.length, mobile: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, legendEntries: categories.length, legendLabels: categories.filter(category => exportFilters.categoryMode !== "selected" || selectedCategorySet.has(category.id)).map(category => category.label) }), [exportRange.start, exportRange.end, exportGridData, exportMonths.length, categories, exportFilters.categoryMode, selectedCategorySet]);
  // Keep the staged publication mounted behind its preview so browser tests and
  // assistive diagnostics can inspect exactly what was captured. Closing the
  // preview immediately restores the compact interactive table.
  const publicationActive = exporting || Boolean(exportUrl);
  const tableMonths = publicationActive && publicationPlan.layout === "month-columns" ? exportMonths : displayedMonths;
  const monthPublication = publicationActive && publicationPlan.layout === "month-columns";

  const isTargetedDateExport = useMemo(() => {
    if (exportFilters.datePreset === "currentGrid" || exportFilters.datePreset === "calendarYear" || /^q[1-4]$/.test(exportFilters.datePreset)) return false;
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) return false;
    return daysBetweenInclusive(start, end) <= TARGETED_EXPORT_MAX_DAYS;
  }, [exportFilters.datePreset, getExportDateRange]);

  const targetedExportWeeks = useMemo(() => {
    if (!exportUiActive) return [];
    const { start, end } = getExportDateRange();
    if (!start || !end || start > end) return [];
    const dates = getDatesInRange(start, end);
    const startDow = parseISODate(start).getDay();
    const days = dates.map((date) => {
      const d = parseISODate(date);
      return {
        date,
        label: `${MONTHS[d.getMonth()]} ${d.getDate()}`,
        weekday: DOW_SHORT[d.getDay()],
        events: exportGridData.get(date) ?? [],
      };
    });
    const padded: ((typeof days)[0] | null)[] = [
      ...Array(startDow).fill(null),
      ...days,
    ];
    const weeks: ((typeof days)[0] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [
    exportGridData,
    exportUiActive,
    getExportDateRange,
  ]);

  // The interactive grid deliberately receives summaries only. Export retains full records
  // and has its own complete range model, so staged UI never changes export semantics.
  const gridModel = useMemo(() => {
    gridMark("lifegrid:grid-model-start");
    gridMark("lifegrid:grid-index-start");
    const model = buildGridWindowViewModel(
      events,
      displayedMonths,
      categoryRank,
      priorGridModelRef.current,
    );
    priorGridModelRef.current = model;
    gridMark("lifegrid:grid-index-complete");
    gridMark("lifegrid:grid-model-complete");
    return model;
  }, [events, displayedMonths, categoryRank]);
  const gridData = gridModel.byDate;
  useEffect(() => {
    setGridReady(false);
    gridMark("lifegrid:grid-first-commit");
    const frame = requestAnimationFrame(() => {
      gridMark("lifegrid:grid-dom-start");
      setGridReady(true);
      setRenderedMonths(
        new Set(displayedMonths.slice(0, 3).map(month => month.key)),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [displayedMonths, activeCalendarId]);
  useEffect(() => {
    if (!gridReady) return;
    let cancelled = false;
    const preferred = Math.max(0, displayedMonths.findIndex(month => month.key === todayStr.slice(0, 7)));
    const order = [
      preferred,
      preferred - 1,
      preferred + 1,
      ...Array.from({ length: 12 }, (_, i) => i),
    ].filter(
      (value, index, values) =>
        value >= 0 && value < 12 && values.indexOf(value) === index,
    );
    let cursor = 3;
    const next = () => {
      if (cancelled) return;
      setRenderedMonths((previous) => {
        const following = new Set(previous);
        order
          .slice(cursor, cursor + 2)
          .forEach((column) => following.add(displayedMonths[column].key));
        return following;
      });
      cursor += 2;
      if (cursor < order.length) {
        if (window.requestIdleCallback) window.requestIdleCallback(next, { timeout: 250 });
        else window.setTimeout(() => requestAnimationFrame(next), 80);
      }
    };
    const frame = requestAnimationFrame(next);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [gridReady, displayedMonths, activeCalendarId, todayStr]);
  // Scroll admission is independent of exports: a month entering the horizontal
  // viewport is made durable immediately, even if idle/rAF callbacks are throttled.
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport || !gridReady) return;
    const admitVisible = () => {
      const first = Math.max(0, Math.floor(viewport.scrollLeft / MONTH_COL_W) - 1);
      const last = Math.min(11, Math.ceil((viewport.scrollLeft + viewport.clientWidth) / MONTH_COL_W) + 1);
      setRenderedMonths(previous => { const next = new Set(previous); for (let month = first; month <= last; month += 1) next.add(displayedMonths[month].key); return next; });
    };
    admitVisible(); viewport.addEventListener("scroll", admitVisible, { passive: true });
    return () => viewport.removeEventListener("scroll", admitVisible);
  }, [gridReady, displayedMonths, activeCalendarId]);
  useEffect(() => {
    const available = new Set(categories.map(category => category.id));
    setExportFilters(previous => {
      const selectedCategoryIds = previous.selectedCategoryIds.filter(id => available.has(id));
      return selectedCategoryIds.length === previous.selectedCategoryIds.length ? previous : { ...previous, selectedCategoryIds, categoryMode: selectedCategoryIds.length ? "selected" : "all" };
    });
  }, [activeCalendarId, categories]);
  useEffect(() => {
    if (!gridReady) return;
    gridMark("lifegrid:grid-first-visible-cell");
    requestAnimationFrame(() => {
      gridMark("lifegrid:grid-dom-complete");
      gridMark("lifegrid:grid-interaction-ready");
    });
  }, [gridReady]);

  const isFocusActive = focusedCats.size > 0;
  const toggleCat = (id: string) =>
    setFocusedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const dim = (catId: string) => isFocusActive && !focusedCats.has(catId);

  const applyExportDatePreset = (datePreset: ExportDatePreset) => {
    const sensibleDefaultStart = detailDate ?? todayStr;
    const sensibleDefaultEnd = toISODate(addDays(parseISODate(sensibleDefaultStart), 6));
    setExportFilters((previous) => ({
      ...previous,
      datePreset,
      customStart: datePreset === "custom" ? previous.customStart || sensibleDefaultStart : previous.customStart,
      customEnd: datePreset === "custom" ? previous.customEnd || sensibleDefaultEnd : previous.customEnd,
    }));
  };
  const resetExportRange = () =>
    setExportFilters((prev) => ({
      ...prev,
      datePreset: "currentGrid",
      customStart: "",
      customEnd: "",
    }));

  const toggleExportCategory = (id: string) => {
    setExportFilters((prev) => {
      const selected = new Set(prev.selectedCategoryIds);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      return {
        ...prev,
        categoryMode: selected.size ? "selected" : "all",
        selectedCategoryIds: Array.from(selected),
      };
    });
  };

  const selectAllExportCategories = () => setExportFilters(prev => ({ ...prev, categoryMode: "all", selectedCategoryIds: [] }));

  // Validation is derived on every render, so corrected inputs, presets, calendar/year changes,
  // and reopening the options panel can never retain a stale disabled/error state.
  const exportRangeError = validateExportRange(
    exportRange,
    year,
    exportFilters.datePreset === "custom",
    TARGETED_EXPORT_MAX_DAYS,
  );
  const isDefaultExportFilter =
    exportFilters.datePreset === "currentGrid" &&
    exportFilters.categoryMode === "all" &&
    exportFilters.projectId === "all";
  const exportFilterSummary = `${exportRange.start || "Start"} → ${exportRange.end || "End"} · ${exportFilters.categoryMode === "all" ? "All tags" : `${exportFilters.selectedCategoryIds.length} tag${exportFilters.selectedCategoryIds.length === 1 ? "" : "s"}`} · ${exportFilters.projectId === "all" ? "All projects" : (sortedProjects.find((p) => p.id === exportFilters.projectId)?.name ?? "Project")}`;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px), (max-height: 600px) and (pointer: coarse)");
    const update = () => setCompactExportLayout(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!exportOptionsOpen || !compactExportLayout) return;
    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const grid = scrollRef.current;
    const gridPosition = grid ? { top: grid.scrollTop, left: grid.scrollLeft } : null;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow, touchAction: body.style.touchAction, rootOverflow: root.style.overflow };
    body.classList.add("lifegrid-export-modal-open");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    root.style.overflow = "hidden";
    const setViewportHeight = () => document.documentElement.style.setProperty("--lifegrid-visual-viewport-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
    setViewportHeight();
    window.visualViewport?.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);
    requestAnimationFrame(() => exportDialogRef.current?.querySelector<HTMLElement>("[aria-label='Close image export']")?.focus());
    return () => {
      body.classList.remove("lifegrid-export-modal-open");
      window.visualViewport?.removeEventListener("resize", setViewportHeight);
      window.removeEventListener("orientationchange", setViewportHeight);
      document.documentElement.style.removeProperty("--lifegrid-visual-viewport-height");
      Object.assign(body.style, { position: previous.position, top: previous.top, width: previous.width, overflow: previous.overflow, touchAction: previous.touchAction });
      root.style.overflow = previous.rootOverflow;
      window.scrollTo(0, scrollY);
      if (grid && gridPosition) { grid.scrollTop = gridPosition.top; grid.scrollLeft = gridPosition.left; }
      exportButtonRef.current?.focus();
    };
  }, [exportOptionsOpen, compactExportLayout]);

  const closeExportOptions = () => {
    if (!exporting) setExportOptionsOpen(false);
  };

  useEffect(() => {
    if (!exportOptionsOpen) return;
    const pointerDown = (event: PointerEvent) => {
      if (exporting) return;
      const target = event.target as Node | null;
      if (target && (exportDialogRef.current?.contains(target) || exportButtonRef.current?.contains(target))) return;
      setExportOptionsOpen(false);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !exporting) setExportOptionsOpen(false);
    };
    document.addEventListener('pointerdown', pointerDown, true);
    window.addEventListener('keydown', keyDown);
    return () => {
      document.removeEventListener('pointerdown', pointerDown, true);
      window.removeEventListener('keydown', keyDown);
    };
  }, [exportOptionsOpen, exporting]);

  useEffect(() => {
    if (didScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const isCurrentYear = year === today.getFullYear();
    const targetMonth = isCurrentYear ? todayMonth : 0;
    const targetDay = isCurrentYear ? todayDay : 1;
    el.scrollLeft = Math.max(0, targetMonth * MONTH_COL_W - 10);
    el.scrollTop = Math.max(0, (targetDay - 1) * ROW_H - 80);
    didScrollRef.current = true;
  });

  useEffect(() => {
    didScrollRef.current = false;
  }, [year]);

  const exportFileName =
    `lifegrid-${activeCalendar?.name ?? "calendar"}-${exportRange.start || year}-${exportRange.end || year}.png`.replace(
      /[^a-zA-Z0-9._-]+/g,
      "-",
    ).replace(/-+/g, "-").toLowerCase();
  const exportLegend = useMemo(
    () =>
      exportUiActive
        ? buildExportLegend(exportFilteredEvents, categories)
        : { entries: [], recordCount: 0 },
    [exportFilteredEvents, categories, exportUiActive],
  );
  const exportMetadata = useMemo(
    () =>
      buildExportMetadata({
        calendarName: activeCalendar?.name ?? "LifeGrid",
        start: exportRange.start,
        end: exportRange.end,
        customTitle: customExportTitle,
        customSubtitle: customExportSubtitle,
        generatedAt: includeGeneratedAt ? new Date() : null,
      }),
    [
      activeCalendar,
      customExportTitle,
      customExportSubtitle,
      exportRange.end,
      exportRange.start,
      includeGeneratedAt,
    ],
  );
  const exportDimensions = getExportDimensions(
    "compact",
    exportLegend.entries.length,
    isTargetedDateExport,
  );
  const focusedGridData = useMemo(() => { const map = new Map<string, readonly GridEventSummary[]>(); gridData.forEach((records, date) => map.set(date, filterGridEventsByCategories(records, focusedCats))); return map; }, [gridData, focusedCats]);

  const getExportCaptureNode = useCallback(
    () => isTargetedDateExport ? targetedExportRef.current : publicationRef.current,
    [isTargetedDateExport],
  );

  // ── Image export (html-to-image renders modern CSS correctly) ──
  // iPhone Safari ignores <a download> for data-URLs, so instead of a silent
  // download we render the PNG and show it in an in-app preview the user can
  // save (long-press) or share via the native share sheet.
  const handleExport = useCallback(async () => {
    const container = scrollRef.current;
    const { start, end } = getExportDateRange();
    const useTargetedLayout = isTargetedDateExport;
    if (!useTargetedLayout && (!tableRef.current || !container)) {
      toast.error("The Current Grid capture is not ready. Wait for the Grid to load and try again.", { id: "export" });
      return;
    }
    const rangeError = validateExportRange(
      { start, end }, year, useTargetedLayout, TARGETED_EXPORT_MAX_DAYS,
    );
    if (rangeError) {
      toast.error(rangeError, { id: "export" });
      return;
    }
    if (
      exportFilters.categoryMode === "selected" &&
      exportFilters.selectedCategoryIds.length === 0
    ) {
      toast.error(
        "Select at least one tag/category, or switch back to all tags.",
        { id: "export" },
      );
      return;
    }
    if (!publicationPlan.feasible) { toast.error(publicationPlan.reason, { id: "export" }); return; }
    setExporting(true);
    setExportStatus("generating");
    const firefoxTargeted = useTargetedLayout && /firefox/i.test(navigator.userAgent);
    setExportRenderer(firefoxTargeted ? "html2canvas" : "html-to-image");
    setExportErrorCode("");
    toast.loading(
      `Generating automatically optimized ${publicationPlan.layout} image…`,
      { id: "export" },
    );

    const prevOverflow = container?.style.overflow ?? "";
    const prevW = container?.style.width ?? "";
    const prevH = container?.style.height ?? "";
    if (!useTargetedLayout && container) {
      container.style.overflow = "visible";
    }

    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const captureNode = getExportCaptureNode();
    if (!captureNode || captureNode.scrollWidth <= 0 || captureNode.scrollHeight <= 0) {
      if (container) {
        container.style.overflow = prevOverflow;
        container.style.width = prevW;
        container.style.height = prevH;
      }
      toast.error("Grid image capture is unavailable. Close Export and try again.", { id: "export" });
      setExportStatus("error");
      setExportErrorCode(captureNode ? "CAPTURE_NODE_ZERO_SIZE" : "CAPTURE_NODE_UNAVAILABLE");
      setExporting(false);
      return;
    }
    if (!useTargetedLayout && captureNode.dataset.publicationReady !== "true") {
      toast.error("The publication is still preparing. Try again.", { id: "export" });
      setExportStatus("error");
      setExportErrorCode("CAPTURE_NODE_NOT_READY");
      setExporting(false);
      return;
    }

    if (!useTargetedLayout && container) {
      container.style.width = captureNode.scrollWidth + "px";
      container.style.height = captureNode.scrollHeight + "px";
    }

    await new Promise(requestAnimationFrame);

    const captureBounds = getPublicationCaptureBounds(captureNode);
    const rendererOptions = {
      pixelRatio: publicationPlan.pixelRatio,
      backgroundColor: theme === "dark" ? "#0d1526" : "#ffffff",
      width: captureBounds.width,
      height: captureBounds.height,
      targeted: useTargetedLayout,
      firefox: firefoxTargeted,
      safari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      layout: publicationPlan.layout,
    };

    try {
      const result = await renderGridPng(captureNode, rendererOptions);
      const { dataUrl, blob } = result;
      try {
        const file = new File([blob], exportFileName, { type: "image/png" });
        const nav = navigator as Navigator & {
          canShare?: (data: ShareData) => boolean;
        };
        setShareAvailable(
          Boolean(
            typeof navigator.share === "function" &&
            nav.canShare?.({ files: [file] }),
          ),
        );
      } catch {
        setShareAvailable(false);
      }
      setExportRenderer(result.renderer);
      setExportStatus("ready");
      setExportUrl(dataUrl);
      toast.success("Grid image ready — save or share it", { id: "export" });
    } catch (err) {
      setExportStatus("error");
      const rendererErrorCode = err instanceof Error ? err.message : "HTML2CANVAS_RENDER_ERROR";
      const safeErrorCodes = new Set([
        "HTML2CANVAS_TIMEOUT", "HTML2CANVAS_RENDER_ERROR", "INVALID_PNG_OUTPUT",
        "EMPTY_PNG_BLOB", "INVALID_PNG_MIME", "CAPTURE_NODE_UNAVAILABLE", "CAPTURE_NODE_ZERO_SIZE",
        "CAPTURE_NODE_NOT_READY", "HTML_TO_IMAGE_TIMEOUT", "HTML2CANVAS_TIMEOUT", "CANVAS2D_TIMEOUT",
      ]);
      setExportErrorCode(safeErrorCodes.has(rendererErrorCode) ? rendererErrorCode : "INVALID_PNG_OUTPUT");
      console.error("Grid image renderer failed", err instanceof Error ? err.message : "unknown error");
      toast.error(
        err instanceof Error && err.message === "EMPTY_PNG_BLOB"
          ? "Grid image renderer returned an empty image. Try a shorter range or filter Categories/Projects."
          : "Grid image could not be generated. Try a shorter range or filter Categories/Projects.",
        { id: "export" },
      );
    } finally {
      if (container) {
        container.style.overflow = prevOverflow;
        container.style.width = prevW;
        container.style.height = prevH;
      }
      setExporting(false);
    }
  }, [
    theme,
    exportFileName,
    exportFilters,
    exportFilteredEvents.length,
    getExportDateRange,
    getExportCaptureNode,
    isDefaultExportFilter,
    isTargetedDateExport,
    publicationPlan,
    year,
  ]);

  const shareExport = async () => {
    if (!exportUrl) return;
    try {
      const blob = await (await fetch(exportUrl)).blob();
      if (!blob.size) throw new Error("empty image output");
        const file = new File([blob], exportFileName, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (navigator.share && nav.canShare?.({ files: [file] }))
        await navigator.share({ files: [file], title: "LifeGrid calendar" });
      else
        toast.error(
          "Sharing images is not available in this browser. Use Download image or press and hold the preview.",
        );
    } catch {
      toast.error("Unable to share the generated image.");
    }
  };

  const downloadExport = () => {
    if (!exportUrl) {
      toast.error("Download failed because no generated image is available.");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = exportUrl;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("The PNG could not be downloaded. Generate the image again.");
    }
  };

  const openAdd = (date: string) => {
    cancelPreviewTimers(); setPreviewEvent(null);
    setDayDetailOpen(false);
    setDetailDate(null);
    setEditEvent(null);
    setAddDate(date);
    setEventSheetOpen(true);
  };
  const openEdit = (evt: Event) => {
    cancelPreviewTimers(); setPreviewEvent(null);
    setDayDetailOpen(false);
    setDetailDate(null);
    setEditEvent(evt);
    setAddDate(null);
    setEventSheetOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* ── Header bar ── */}
      <div className="flex-none relative min-w-0 px-3 py-2 flex flex-wrap items-center gap-2 border-b border-border bg-card">
        {/* Calendar version switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 min-w-0 max-w-[min(20rem,38vw)] text-left"
              title={activeCalendar?.name ?? "LifeGrid"}
              data-testid="button-calendar-switcher"
            >
              <span className="text-base font-bold tracking-tight truncate">
                {activeCalendar?.name ?? "LifeGrid"}
              </span>
              <ChevronDown
                size={14}
                className="shrink-0 text-muted-foreground"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Calendar versions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {calendars.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => switchCalendar(c.id)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{c.name}</span>
                {c.id === activeCalendarId && (
                  <Check size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled
              className="text-[11px] text-muted-foreground"
            >
              Manage versions in Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Calendar-year and rolling start controls */}
        <div className="flex shrink-0 items-center gap-1 sm:ml-3">
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button aria-label="Previous calendar year" onClick={() => { setViewStart({ year: viewStart.year - 1, monthIndex: 0 }); scrollRef.current?.scrollTo({ left: 0 }); }} className="min-h-9 min-w-9 rounded hover:bg-background" data-testid="button-year-prev"><ChevronLeft size={14} className="mx-auto" /></button>
            <button aria-label={`Show calendar year ${year}`} title={`Show calendar year ${year}`} onClick={() => { setViewStart({ year, monthIndex: 0 }); scrollRef.current?.scrollTo({ left: 0 }); }} className="min-h-9 min-w-[3rem] px-1 text-sm font-bold tabular-nums" data-testid="button-year-reset">{year}</button>
            <button aria-label="Next calendar year" onClick={() => { setViewStart({ year: viewStart.year + 1, monthIndex: 0 }); scrollRef.current?.scrollTo({ left: 0 }); }} className="min-h-9 min-w-9 rounded hover:bg-background" data-testid="button-year-next"><ChevronRight size={14} className="mx-auto" /></button>
          </div>
          <div className="flex items-center rounded-lg bg-muted p-0.5" aria-label="Start month">
            <span className="hidden px-1 text-[9px] font-bold uppercase text-muted-foreground sm:inline">Start</span>
            <button aria-label="Previous start month" onClick={() => { setViewStart(addCalendarMonths(viewStart, -1)); scrollRef.current?.scrollTo({ left: 0 }); }} className="min-h-9 min-w-9 rounded hover:bg-background" data-testid="button-month-prev"><ChevronLeft size={14} className="mx-auto" /></button>
            <span aria-label={`Current start month ${displayedMonths[0].label} ${displayedMonths[0].year}`} className="inline-flex min-h-9 min-w-10 items-center justify-center px-1 text-xs font-bold" data-testid="button-month-current">{displayedMonths[0].label}</span>
            <button aria-label="Next start month" onClick={() => { setViewStart(addCalendarMonths(viewStart, 1)); scrollRef.current?.scrollTo({ left: 0 }); }} className="min-h-9 min-w-9 rounded hover:bg-background" data-testid="button-month-next"><ChevronRight size={14} className="mx-auto" /></button>
          </div>
        </div>

        <div className="hidden flex-1 sm:block" />

        {/* Compact grid image export controls */}
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <button
            onClick={() => setExportOptionsOpen(open => !open)}
            ref={exportButtonRef}
            disabled={exporting}
            aria-describedby={
              exportRangeError ? "export-range-error" : undefined
            }
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-muted-foreground transition-colors disabled:opacity-50"
            data-testid="button-export"
            title="Create grid image"
          >
            <Image size={12} />
            {exporting ? "Working…" : "Export"}
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
          data-testid="button-theme-toggle"
          title={
            theme === "dark" ? "Switch to day mode" : "Switch to night mode"
          }
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {exportOptionsOpen && (
        <div
          className={compactExportLayout ? "export-modal-layer fixed inset-0 z-[100] flex bg-black/45 p-0" : "flex-none"}
          onMouseDown={(event) => {
            if (compactExportLayout && event.target === event.currentTarget) closeExportOptions();
          }}
          data-testid={compactExportLayout ? "export-mobile-scrim" : undefined}
        >
          <div
            ref={exportDialogRef}
            tabIndex={-1}
            role={compactExportLayout ? "dialog" : undefined}
            aria-modal={compactExportLayout || undefined}
            aria-labelledby={compactExportLayout ? "mobile-export-title" : undefined}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeExportOptions();
              if (compactExportLayout && event.key === "Tab") {
                const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"));
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
              }
            }}
            className={compactExportLayout
              ? "export-modal-panel flex h-[100vh] h-[100dvh] h-[var(--lifegrid-visual-viewport-height,100dvh)] w-full min-w-0 flex-col overflow-hidden bg-card shadow-2xl"
              : "flex-none max-h-[calc(100dvh-10rem)] min-w-0 overflow-y-auto border-b border-border bg-card/95 px-3 py-3 space-y-3 overscroll-contain"}
            data-testid={compactExportLayout ? "panel-export-mobile" : "panel-export-options"}
          >
            {compactExportLayout && (
              <header className="export-modal-header flex flex-none items-center justify-between gap-3 border-b border-border bg-card px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                <div className="min-w-0"><h2 id="mobile-export-title" className="text-sm font-bold">Image export</h2><p className="truncate text-[11px] text-muted-foreground" data-testid="export-filter-summary">{exportFilterSummary}</p></div>
                <Button type="button" variant="outline" onClick={closeExportOptions} disabled={exporting} className="min-h-11 shrink-0" aria-label="Close image export">Close</Button>
              </header>
            )}
            <div ref={exportBodyRef} className={compactExportLayout ? "export-modal-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 pb-8 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] touch-pan-y" : undefined}>
            <div className={compactExportLayout ? "space-y-4" : undefined}>
          {!compactExportLayout && <div>
            <div className="text-xs font-bold text-foreground">Image export filters</div>
            <div className="wrap-anywhere whitespace-normal text-[11px] text-muted-foreground" data-testid="export-filter-summary">{exportFilterSummary}</div>
          </div>}



          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold">
              Custom title
              <input
                value={customExportTitle}
                maxLength={120}
                onChange={(e) => setCustomExportTitle(e.target.value)}
                className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold">
              Custom subtitle
              <input
                value={customExportSubtitle}
                maxLength={180}
                onChange={(e) => setCustomExportSubtitle(e.target.value)}
                className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-1 text-xs font-semibold">
              <input
                type="checkbox"
                checked={includeGeneratedAt}
                onChange={(e) => setIncludeGeneratedAt(e.target.checked)}
              />{" "}
              Include generated timestamp
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground" role="status" data-testid="export-publication-summary">
            Layout optimized automatically for this range. Preview: {exportMetadata.title} · {exportLegend.recordCount} records · {exportLegend.entries.length} categories.
          </p>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Date range
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  ["currentGrid", "Current Grid"],
                  ["calendarYear", "Calendar Year"],
                  ["q1", "Q1"], ["q2", "Q2"], ["q3", "Q3"], ["q4", "Q4"],
                  ["next7", "Next 7"],
                  ["next14", "Next 14"],
                  ["next30", "Next 30"],
                  ["custom", "Custom"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`export-date-preset-${id}`}
                    aria-pressed={exportFilters.datePreset === id}
                    onClick={() => applyExportDatePreset(id as ExportDatePreset)}
                    className={`rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${exportFilters.datePreset === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Next presets begin today. Use Custom for another starting date.
              </p>
              {exportFilters.datePreset === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={exportFilters.customStart}
                    onChange={(e) =>
                      setExportFilters((prev) => ({
                        ...prev,
                        customStart: e.target.value,
                      }))
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    data-testid="input-export-start"
                  />
                  <input
                    type="date"
                    value={exportFilters.customEnd}
                    onChange={(e) =>
                      setExportFilters((prev) => ({
                        ...prev,
                        customEnd: e.target.value,
                      }))
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    data-testid="input-export-end"
                  />
                </div>
              )}
              {exportRangeError && (
                <p
                  id="export-range-error"
                  role="alert"
                  className="text-[10px] font-medium text-destructive"
                >
                  {exportRangeError}
                </p>
              )}
              <button
                type="button"
                onClick={resetExportRange}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Reset Export Range
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Tags / categories
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={selectAllExportCategories}
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${exportFilters.categoryMode === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    data-testid={`export-category-${category.id}`}
                    type="button"
                    onClick={() => toggleExportCategory(category.id)}
                    className={`rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${exportFilters.categoryMode === "selected" && selectedCategorySet.has(category.id) ? "" : "bg-muted text-muted-foreground"}`}
                    style={
                      exportFilters.categoryMode === "selected" &&
                      selectedCategorySet.has(category.id)
                        ? { backgroundColor: category.color, color: getReadableTextColor(category.color) }
                        : undefined
                    }
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Project
              </div>
              <select
                value={exportFilters.projectId}
                onChange={(e) =>
                  setExportFilters((prev) => ({
                    ...prev,
                    projectId: e.target.value,
                  }))
                }
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                data-testid="select-export-project"
              >
                <option value="all">All projects</option>
                {sortedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Project focus includes events linked to tasks in that project.
              </p>
            </div>
          </div>
          <p className="wrap-anywhere whitespace-normal text-[10px] leading-snug text-muted-foreground pt-1">
            Creates a readable grid image from the selected date range and
            filters. Notes are not included.
          </p>
          {!compactExportLayout && <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <div className="flex gap-2"><Button type="button" onClick={handleExport} disabled={exporting || !!exportRangeError} className="min-h-11 flex-1 gap-2" data-testid="button-export-generate"><Image size={16} /> {exporting ? "Generating image…" : "Generate image"}</Button><Button type="button" variant="outline" onClick={closeExportOptions} className="min-h-11" disabled={exporting}>Close</Button></div>
          </div>}
            </div>
            </div>
            {compactExportLayout && <footer className="export-modal-footer flex flex-none gap-2 border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3" data-testid="mobile-export-footer">
              <Button type="button" onClick={handleExport} disabled={exporting || !!exportRangeError} className="min-h-11 flex-1 gap-2" data-testid="button-export-generate"><Image size={16} /> {exporting ? "Generating image…" : "Generate image"}</Button>
              <Button type="button" variant="outline" onClick={closeExportOptions} className="min-h-11" disabled={exporting}>Close</Button>
            </footer>}
          </div>
        </div>
      )}

      {/* ── Color legend (clickable focus toggles) ── */}
      <div className="flex-none px-3 py-1.5 flex items-center gap-2 border-b border-border bg-card/50 overflow-x-auto">
        {categories.map((c) => {
          const on = focusedCats.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full transition-all ${
                on
                  ? "bg-primary/15 ring-1 ring-primary/40"
                  : isFocusActive
                    ? "opacity-40"
                    : ""
              }`}
              data-testid={`legend-${c.id}`}
              title={`Focus on ${c.label}`}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: c.color }}
              />
              <span className="text-[10px] font-medium text-muted-foreground">
                {c.label}
              </span>
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
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        aria-busy={!gridReady}
        data-testid="grid-content"
        data-detail-date={detailDate ?? ""}
        data-day-detail-open={dayDetailOpen ? "true" : "false"}
      >
        {!gridReady && (
          <div
            className="p-4 text-sm text-muted-foreground"
            role="status"
            data-testid="grid-loading"
          >
            Preparing calendar grid…
          </div>
        )}
        {gridReady && (
          <div
            ref={publicationRef}
            data-testid="export-month-publication"
            data-publication-ready={monthPublication ? "true" : "false"}
            className={
              exporting
                ? "lifegrid-export-publication bg-background p-6"
                : undefined
            }
            style={
              exporting
                ? {
                    width: getMonthPublicationWidth(tableMonths.length),
                    minWidth: getMonthPublicationWidth(tableMonths.length),
                    boxSizing: "border-box",
                    padding: PUBLICATION_HORIZONTAL_PADDING,
                  }
                : undefined
            }
          >
            <span className="sr-only" role="status" aria-live="polite">
              {exporting ? "Generating grid image" : ""}
            </span>
            {exporting && (
              <ExportPublicationHeader
                metadata={exportMetadata}
                legend={exportLegend.entries}
              />
            )}
            <table
              ref={tableRef}
              data-publication-layout={monthPublication ? "month-columns" : "interactive"}
              className="border-collapse bg-background"
              style={{ width: getMonthTableWidth(tableMonths.length), minWidth: getMonthTableWidth(tableMonths.length) }}
            >
              <thead className="sticky top-0 z-20">
                <tr style={{ height: HEADER_H }}>
                  <th
                    className="sticky left-0 z-30 border-b-2 border-r border-border bg-card"
                    style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                  />
                  {tableMonths.map((month, mIdx) => {
                    const isCurrent =
                      month.key === todayStr.slice(0, 7);
                    return (
                      <th
                        key={month.key}
                        className={`border-b-2 border-r border-border text-left align-bottom bg-card ${isCurrent ? "bg-primary/5" : ""}`}
                        style={{
                          width: MONTH_COL_W,
                          minWidth: MONTH_COL_W,
                          padding: "4px 6px",
                        }}
                        data-testid={`header-month-${month.key}`} data-month-key={month.key}
                        aria-label={`${month.label} ${month.year}`}
                      >
                        <div
                          className={`text-[11px] font-extrabold uppercase tracking-widest leading-none ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {month.label}
                        </div>
                        <div
                          className={`text-[9px] mt-0.5 font-medium ${isCurrent ? "text-primary/60" : "text-muted-foreground/40"}`}
                        >
                          {month.year}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isExpandedExport = publicationActive;
                  const rowEventMax = tableMonths.reduce((max, month) => {
                    if (day > month.daysInMonth) return max;
                    const dateStr = `${month.key}-${String(day).padStart(2, "0")}`;
                    return Math.max(max, (publicationActive ? exportGridData : focusedGridData).get(dateStr)?.length ?? 0);
                  }, 0);
                  const rowHeight = monthPublication
                    ? Math.max(
                        ROW_H,
                        EXPORT_ROW_BASE_H + rowEventMax * (publicationPlan.eventBlockHeight + 1),
                      )
                    : ROW_H;
                  return (
                    <tr key={day} style={{ height: rowHeight }}>
                      <td
                        className="sticky left-0 z-10 border-b border-r border-border bg-card text-center font-bold text-muted-foreground select-none"
                        style={{
                          width: DAY_COL_W,
                          minWidth: DAY_COL_W,
                          fontSize: 10,
                        }}
                        data-testid={`row-day-${day}`}
                      >
                        {day}
                      </td>

                      {tableMonths.map((month) => {
                        const maxDay = month.daysInMonth;
                        const dateStr = `${month.key}-${String(day).padStart(2, "0")}`;
                        const temporal = getDateTemporalState(
                          dateStr,
                          todayStr,
                          detailDate,
                        );
                        const isToday = temporal.isToday;

                        if (day > maxDay || (publicationActive && (dateStr < exportRange.start || dateStr > exportRange.end))) {
                          return (
                            <td
                              key={`${month.key}-${day}`}
                              data-testid={`cell-${dateStr}`}
                              data-outside-range={publicationActive && dateStr >= month.startDate && dateStr <= month.endDate ? "true" : undefined}
                              className="border-b border-r border-border"
                              style={{
                                width: MONTH_COL_W,
                                background:
                                  theme === "dark"
                                    ? "rgba(148,163,184,0.08)"
                                    : "#f5f5f5",
                              }}
                            />
                          );
                        }

                        const dateObj = new Date(month.year, month.monthIndex, day);
                        const dow = DOW_SHORT[dateObj.getDay()];
                        const isWeekend =
                          dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        // Noncritical month cells stay structurally present for table/scroll safety,
                        // but defer event-pill DOM until their deterministic batch is admitted.
                        const monthVisible =
                          publicationActive || renderedMonths.has(month.key);
                        const dayEvents = monthVisible
                          ? ((publicationActive ? exportGridData : focusedGridData).get(dateStr) ?? [])
                          : [];
                        const denseDay = getDenseDay(
                          dayEvents,
                          exporting
                            ? EXPORT_DENSITY.compact.cellLimit
                            : MAX_VISIBLE_EVENTS,
                        );
                        const visEvents = isExpandedExport
                          ? dayEvents
                          : denseDay.visible;
                        const overflow = isExpandedExport
                          ? 0
                          : denseDay.overflow;

                        let cellBg: string;
                        if (isToday) {
                          cellBg =
                            theme === "dark"
                              ? "rgba(59,130,246,0.15)"
                              : "#eff6ff";
                        } else if (isWeekend) {
                          cellBg =
                            theme === "dark"
                              ? "rgba(148,163,184,0.10)"
                              : "#fafafa";
                        } else {
                          cellBg = "transparent";
                        }

                        return (
                          <td
                            key={`${month.key}-${day}`}
                            className={`border-b border-r border-border cursor-pointer select-none relative align-top ${temporal.isPast ? "opacity-70" : ""} ${temporal.isSelected ? "ring-2 ring-inset ring-foreground/70" : ""} ${isToday ? "ring-2 ring-inset ring-primary" : ""} focus-within:ring-2 focus-within:ring-inset focus-within:ring-foreground`}
                            style={{
                              width: MONTH_COL_W,
                              minWidth: MONTH_COL_W,
                              height: rowHeight,
                              background: temporal.isPast
                                ? theme === "dark"
                                  ? "rgba(71,85,105,0.18)"
                                  : "rgba(148,163,184,0.13)"
                                : cellBg,
                              padding: "2px 3px",
                            }}
                            onClick={() => openDayDetail(dateStr)}
                            aria-label={`${dateStr}${isToday ? ", Today" : ""}${temporal.isPast ? ", past date" : ""}${temporal.isSelected ? ", selected" : ""}`}
                            data-testid={`cell-${dateStr}`}
                          >
                            {isToday && (
                              <>
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                                <span className="sr-only">Today</span>
                              </>
                            )}
                            {temporal.isSelected && (
                              <span className="sr-only">Selected date</span>
                            )}

                            <div
                              className="text-[8px] font-bold leading-none mb-0.5"
                              style={{
                                color: isToday
                                  ? "hsl(var(--primary))"
                                  : isWeekend
                                    ? theme === "dark"
                                      ? "rgba(255,255,255,0.3)"
                                      : "rgba(0,0,0,0.3)"
                                    : theme === "dark"
                                      ? "rgba(255,255,255,0.2)"
                                      : "rgba(0,0,0,0.2)",
                              }}
                            >
                              {dow}
                            </div>

                            <div
                              className={
                                isExpandedExport
                                  ? "flex flex-col gap-px"
                                  : "flex flex-col gap-px overflow-hidden"
                              }
                            >
                              {visEvents.map((evt) => (
                                <button
                                  type="button"
                                  key={evt.id}
                                  className={`w-full rounded-sm border-0 px-1 flex gap-0.5 overflow-hidden text-left transition-opacity focus:outline-none focus:ring-1 focus:ring-white ${monthPublication ? "items-start py-1" : "items-center"}`}
                                  title={`${evt.title}${evt.eventKind ? ` · ${evt.eventKind}` : ""}${evt.startTime ? ` · ${evt.startTime}${evt.endTime ? `–${evt.endTime}` : ""}` : ""}`}
                                  aria-label={`${evt.title}. Press Enter to open date details.`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    finishEventPointerActivation();
                                    openDayDetail(dateStr);
                                  }}
                                  onPointerDown={beginEventPointerActivation}
                                  onPointerCancel={finishEventPointerActivation}
                                  onPointerEnter={(e) => {
                                    const fullEvent = resolveEventById(
                                      events,
                                      evt.id,
                                    );
                                    if (
                                      fullEvent &&
                                      window.matchMedia("(hover: hover)")
                                        .matches
                                    ) {
                                      cancelPreviewTimers();
                                      const anchor = e.currentTarget.getBoundingClientRect();
                                      previewOpenTimerRef.current = window.setTimeout(() =>
                                        setPreviewEvent({ event: fullEvent, date: dateStr, anchor }), 125);
                                    }
                                  }}
                                  onPointerLeave={schedulePreviewClose}
                                  onFocus={(e) => {
                                    if (eventPointerActivationRef.current) return;
                                    const fullEvent = resolveEventById(
                                      events,
                                      evt.id,
                                    );
                                    if (fullEvent) {
                                      cancelPreviewTimers();
                                      setPreviewEvent({
                                        event: fullEvent,
                                        date: dateStr,
                                        anchor: e.currentTarget.getBoundingClientRect(),
                                      });
                                    }
                                  }}
                                  onBlur={schedulePreviewClose}
                                  aria-describedby={
                                    previewEvent?.event.id === evt.id
                                      ? `day-type-preview-${evt.id}`
                                      : undefined
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelPreviewTimers();
                                      setPreviewEvent(null);
                                      e.currentTarget.focus();
                                    }
                                  }}
                                  style={{
                                    backgroundColor: evt.color ?? undefined,
                                    color: getReadableTextColor(evt.color),
                                    height: monthPublication
                                      ? publicationPlan.eventBlockHeight
                                      : EVENT_PILL_H,
                                    opacity: dim(evt.category) ? 0.18 : 1,
                                  }}
                                  data-testid={`event-pill-${evt.id}`}
                                  data-occurrence-date={dateStr}
                                  data-publication-event={monthPublication ? "true" : "false"}
                                  data-export-title-lines={monthPublication ? publicationPlan.eventTitleLines : undefined}
                                >
                                  {evt.startTime && (
                                    <span
                                      className="shrink-0 tabular-nums"
                                      style={{ fontSize: 7, lineHeight: 1 }}
                                    >
                                      {evt.startTime}
                                    </span>
                                  )}
                                  <span
                                    data-publication-event-title={monthPublication ? "true" : "false"}
                                    className={monthPublication
                                      ? "min-w-0 font-semibold whitespace-normal [overflow-wrap:anywhere] [word-break:normal]"
                                      : "min-w-0 font-semibold truncate"}
                                    style={monthPublication ? {
                                      fontSize: publicationPlan.eventFontSize,
                                      lineHeight: `${publicationPlan.eventLineHeight}px`,
                                      display: "-webkit-box",
                                      WebkitLineClamp: publicationPlan.eventTitleLines,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    } : { fontSize: 8, lineHeight: 1 }}
                                  >
                                    {evt.title}
                                  </span>
                                </button>
                              ))}

                              {overflow > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDayDetail(dateStr);
                                  }}
                                  aria-label={denseDay.overflowLabel}
                                  className="text-[7px] font-bold px-1 text-left"
                                  style={{
                                    color:
                                      theme === "dark"
                                        ? "rgba(255,255,255,0.4)"
                                        : "rgba(0,0,0,0.4)",
                                    lineHeight: 1,
                                  }}
                                >
                                  +{overflow} more
                                </button>
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
      </div>
      <p className="sr-only" aria-live="polite">
        {gridReady ? "Grid ready" : "Loading grid"}
      </p>

      {(exporting || exportOptionsOpen) && isTargetedDateExport && createPortal(
        <div
          ref={targetedExportRef}
          className="fixed left-0 top-0 bg-background text-foreground pointer-events-none"
          style={{
            width: exportDimensions.width,
            padding: EXPORT_DENSITY.compact.padding,
            zIndex: 40,
            opacity: exporting ? 1 : 0,
          }}
          data-testid="targeted-export-grid"
          data-publication-ready={publicationActive ? "true" : "false"}
          data-publication-text-profile={publicationPlan.textProfile}
          data-publication-title-lines={publicationPlan.eventTitleLines}
          data-publication-font-size={publicationPlan.eventFontSize}
          data-publication-line-height={publicationPlan.eventLineHeight}
          data-publication-card-height={publicationPlan.eventBlockHeight}
          aria-hidden="true"
        >
          <ExportPublicationHeader
            metadata={exportMetadata}
            legend={exportLegend.entries}
          />

          {exportFilteredEvents.length === 0 && (
            <p className="border-x border-t border-border px-3 py-2 text-sm text-muted-foreground" data-testid="targeted-export-empty">
              No matching events in this range.
            </p>
          )}

          <table className="w-full table-fixed border-collapse overflow-hidden rounded-xl border border-border bg-background">
            <thead>
              <tr>
                {DOW_SHORT.map((day) => (
                  <th
                    key={day}
                    className="border-b border-r border-border bg-card px-2 py-2 text-left text-xs font-extrabold uppercase tracking-widest text-muted-foreground last:border-r-0"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targetedExportWeeks.map((week, weekIdx) => {
                const weekMax = Math.max(
                  0,
                  ...week.map((day) => day?.events.length ?? 0),
                );
                const cellHeight = Math.max(112, 48 + weekMax * publicationPlan.eventBlockHeight);
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
                          data-testid={`targeted-export-day-${day.date}`}
                          className="border-b border-r border-border align-top last:border-r-0"
                          style={{ height: cellHeight, padding: 6 }}
                        >
                          <div data-publication-date="true" aria-label={day.label} className="mb-2 flex items-baseline gap-1 overflow-visible whitespace-nowrap [text-overflow:clip]">
                            <span data-publication-month="true" className="text-[11px] font-bold uppercase text-muted-foreground">{MONTHS[parseISODate(day.date).getMonth()]}</span>
                            <span data-publication-day="true" className="text-sm font-extrabold text-foreground">{parseISODate(day.date).getDate()}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {visibleEvents.map((evt) => (
                              <div
                                key={evt.id}
                                data-testid={`targeted-export-event-${day.date}-${evt.id}`}
                                data-source-event-id={evt.id}
                                data-export-title-lines={publicationPlan.eventTitleLines}
                                data-publication-event="true"
                                style={{ backgroundColor: evt.color ?? undefined, color: getReadableTextColor(evt.color), minHeight: publicationPlan.eventBlockHeight }}
                                className="flex items-start gap-1 rounded-md px-1.5 py-1"
                              >
                                {evt.startTime && (
                                  <span
                                    className="shrink-0 tabular-nums"
                                    style={{ fontSize: 9, lineHeight: 1.1 }}
                                  >
                                    {evt.startTime}
                                  </span>
                                )}
                                <span
                                  data-publication-event-title="true"
                                  className="font-bold whitespace-normal [overflow-wrap:anywhere] [word-break:normal]"
                                  style={{ fontSize: publicationPlan.eventFontSize, lineHeight: `${publicationPlan.eventLineHeight}px`, display: "-webkit-box", WebkitLineClamp: publicationPlan.eventTitleLines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                                >
                                  {evt.title}
                                </span>
                              </div>
                            ))}
                            {overflow > 0 && (
                              <div className="px-1 text-[9px] font-bold text-muted-foreground">
                                +{overflow} more
                              </div>
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
        </div>,
        document.body,
      )}
      {exporting && isTargetedDateExport && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background" data-testid="export-generation-mask">
          <span className="rounded-lg bg-card px-4 py-3 text-sm font-semibold shadow-lg">Generating grid image…</span>
        </div>,
        document.body,
      )}

      <span
        className="sr-only"
        data-testid="grid-export-status"
        data-export-status={exportStatus}
        data-export-renderer={exportRenderer ?? ""}
        data-export-error-code={exportErrorCode}
      >{exportStatus}</span>

      {/* Add-event FAB */}
      <button
        onClick={() => openAdd(addEventDefaultDate)}
        className="absolute bottom-20 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        data-testid="button-add-event"
        title="Add event"
      >
        <Plus size={22} />
      </button>

      <DayTypePreview
        event={previewEvent?.event ?? null}
        date={previewEvent?.date ?? todayStr}
        category={
          categories.find(
            (category) => category.id === previewEvent?.event.category,
          )?.label ?? "Other"
        }
        project={projects.find(project => project.id === previewEvent?.event.projectId)?.name ?? null}
        anchor={previewEvent?.anchor ?? null}
        onClose={() => { cancelPreviewTimers(); setPreviewEvent(null); }}
        onInteractionEnter={keepPreviewOpen}
        onInteractionLeave={schedulePreviewClose}
      />

      <DayDetailSheet
        date={detailDate}
        isOpen={dayDetailOpen}
        onClose={closeDayDetail}
        onAddEvent={openAdd}
        onEditEvent={openEdit}
      />

      {eventSheetOpen && (
        <EventSheet
          isOpen={eventSheetOpen}
          onClose={() => {
            setEventSheetOpen(false);
            setEditEvent(null);
            setAddDate(null);
          }}
          initialData={editEvent}
          defaultDate={addDate ?? undefined}
        />
      )}

      {/* Export image preview — iPhone-friendly (long-press to save) */}
      {exportUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col"
          onClick={() => {
            setExportUrl(null);
            setShareAvailable(false);
            setExportStatus("idle");
            setExportRenderer(null);
            setExportErrorCode("");
          }}
          data-testid="export-preview"
          data-export-renderer={exportRenderer ?? ""}
        >
          <div className="flex-none px-4 py-3 flex items-center justify-between text-white">
            <span className="text-sm font-semibold">Your grid image</span>
            <button
              onClick={() => {
                setExportUrl(null);
                setShareAvailable(false);
                setExportStatus("idle");
                setExportRenderer(null);
                setExportErrorCode("");
              }}
              className="p-1.5 rounded-lg hover:bg-white/10"
              data-testid="button-export-close"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="flex-1 overflow-auto px-4 flex items-start justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={exportUrl}
              alt="LifeGrid calendar export"
              data-testid="export-preview-image"
              className="max-w-full rounded-lg shadow-2xl"
            />
          </div>
          <div
            className="flex-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-[11px] text-white/70">
              On iPhone: press and hold the image, then “Save Image”.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {"share" in navigator && (
                <Button
                  onClick={shareExport}
                  variant="secondary"
                  className="min-h-11 flex-1 gap-2"
                  data-testid="button-export-share"
                >
                  <Share2 size={16} /> Share image
                </Button>
              )}
              <Button
                onClick={downloadExport}
                className="min-h-11 flex-1 gap-2"
                data-testid="button-export-download"
              >
                <Download size={16} /> Download image
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
