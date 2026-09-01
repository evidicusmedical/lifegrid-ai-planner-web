import { countCalendarMonthsInclusive } from './gridWindow.js';
import { EXPORT_FEASIBILITY_LIMITS } from './gridPublication.js';
import { estimateLegendRows, getPublicationContentWidth, selectPublicationTextProfile, type PublicationTextProfileName } from './gridPublicationText.js';
import { choosePublicationLayout, choosePublicationOrientation, LETTER_FRAME, type PublicationLayout } from './operationalExport.js';

export type GridPublicationLayout = PublicationLayout;
export type GridPublicationPlan = {
  feasible: boolean; layout: GridPublicationLayout; monthCount: number; dayCount: number; columnCount: number;
  cssWidth: number; estimatedHeight: number; eventTitleLines: number; eventLineHeight: number;
  eventPadding: number; eventBlockHeight: number; eventFontSize: number; dateFontSize: number;
  pixelRatio: number; includeAllEvents: boolean; reason: string;
  textProfile: PublicationTextProfileName; legendEstimatedRows: number;
  rollingRowHeight: number; rollingTableBodyHeight: number;
};

export const planRollingGridRows = (input: { rowCount: number; maxEventsPerDay: number; eventBlockHeight: number }) => {
  const rowCount = Math.max(1, input.rowCount);
  const cardGaps = Math.max(0, input.maxEventsPerDay - 1) * 4;
  const rowHeight = Math.min(240, Math.max(112, 48 + input.maxEventsPerDay * input.eventBlockHeight + cardGaps));
  return { rowCount, rowHeight, tableBodyHeight: rowCount * rowHeight };
};

const ROLLING_PUBLICATION_VERTICAL_PADDING = 48;
const ROLLING_PUBLICATION_HEADER_FIXED_HEIGHT = 112;
const ROLLING_PUBLICATION_LEGEND_ROW_HEIGHT = 24;
const ROLLING_PUBLICATION_WEEKDAY_HEADER_HEIGHT = 33;

const dayCount = (start: string, end: string) => Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;

export const planGridPublication = (input: { preset?: string; start: string; end: string; recordsByDate?: ReadonlyMap<string, readonly { title?: string }[]>; monthCount?: number; mobile?: boolean; legendEntries?: number; legendLabels?: readonly string[] }): GridPublicationPlan & { orientation: 'portrait'|'landscape' } => {
  const days = dayCount(input.start, input.end);
  const months = input.monthCount ?? countCalendarMonthsInclusive(input.start, input.end);
  const layout = choosePublicationLayout(input.preset ?? 'custom', input.start, input.end);
  const columns = layout === 'month-columns' ? months : 7;
  const counts = [...(input.recordsByDate?.values() ?? [])].map(records => records.length).filter(Boolean).sort((a,b)=>a-b);
  const titles = [...(input.recordsByDate?.values() ?? [])].flatMap(records => records.map(record => record.title ?? '')).filter(Boolean);
  const percentile = (values: number[], fraction: number) => values.length ? values[Math.min(values.length - 1, Math.floor(values.length * fraction))] : 0;
  const maxPerDate = Math.max(0, ...counts);
  const orientation = choosePublicationOrientation(layout, titles.length);
  const cssWidth = layout === 'month-columns' ? getPublicationContentWidth(layout, columns) : LETTER_FRAME[orientation].width;
  const densityLayout = layout === 'month-columns' ? 'month-columns' : days <= 14 ? 'week' : 'multiweek';
  const profile = selectPublicationTextProfile({ layout: densityLayout, dayCount: days, monthCount: months, totalEventCount: titles.length, occupiedCellCount: counts.length, maxEventsPerCell: maxPerDate, medianEventsPerOccupiedCell: percentile(counts,.5), p90EventsPerOccupiedCell: percentile(counts,.9), longestTitleLength: Math.max(0,...titles.map(t=>t.length)), medianTitleLength: percentile(titles.map(t=>t.length).sort((a,b)=>a-b),.5), estimatedWidth: cssWidth });
  const lines = profile.maxLines, eventLineHeight = profile.lineHeight, eventPadding = profile.paddingY;
  const eventBlockHeight = profile.blockHeight;
  const rows = layout === 'month-columns' ? 31 : layout === 'day-agenda' ? Math.ceil(Math.max(1, titles.length) / 16) : Math.ceil(days / 7);
  // Month publication renders a structural 52px minimum row and otherwise uses
  // a 16px base plus one planned block and gap per record. Keep feasibility at
  // least as conservative as the DOM that GridView captures.
  const rowHeight = layout === 'month-columns'
    ? Math.max(52, 16 + maxPerDate * (eventBlockHeight + 1))
    : Math.max(120, maxPerDate * eventBlockHeight + 38);
  const legendEstimatedRows = input.legendLabels ? estimateLegendRows(input.legendLabels, cssWidth - 64) : Math.ceil((input.legendEntries ?? 0) / 6);
  const rollingRows = planRollingGridRows({ rowCount: rows, maxEventsPerDay: maxPerDate, eventBlockHeight });
  const estimatedHeight = layout === 'rolling-day-grid'
    ? ROLLING_PUBLICATION_VERTICAL_PADDING + ROLLING_PUBLICATION_HEADER_FIXED_HEIGHT
      + legendEstimatedRows * ROLLING_PUBLICATION_LEGEND_ROW_HEIGHT
      + ROLLING_PUBLICATION_WEEKDAY_HEADER_HEIGHT + rollingRows.tableBodyHeight
    : 132 + rows * rowHeight + legendEstimatedRows * 28;
  const limits = input.mobile ? { area: EXPORT_FEASIBILITY_LIMITS.mobileArea, edge: EXPORT_FEASIBILITY_LIMITS.mobileEdge } : { area: EXPORT_FEASIBILITY_LIMITS.desktopArea, edge: EXPORT_FEASIBILITY_LIMITS.desktopEdge };
  const pixelRatio = [2, 1.5, 1].find(ratio => cssWidth * ratio <= limits.edge && estimatedHeight * ratio <= limits.edge && cssWidth * estimatedHeight * ratio * ratio <= limits.area) ?? 0;
  const feasible = pixelRatio > 0;
  return { feasible, layout, orientation, monthCount: months, dayCount: days, columnCount: columns, cssWidth, estimatedHeight, eventTitleLines: lines, eventLineHeight, eventPadding, eventBlockHeight, eventFontSize: profile.fontSize, dateFontSize: layout === 'month-columns' ? 10 : 14, pixelRatio, includeAllEvents: feasible, textProfile: profile.name, legendEstimatedRows, rollingRowHeight: rollingRows.rowHeight, rollingTableBodyHeight: rollingRows.tableBodyHeight, reason: feasible ? `${layout === 'month-columns' ? `${months}-month` : layout} layout optimized automatically` : 'This publication contains too much information for one reliable image on this device. Try a shorter range or filter Categories/Projects.' };
};
