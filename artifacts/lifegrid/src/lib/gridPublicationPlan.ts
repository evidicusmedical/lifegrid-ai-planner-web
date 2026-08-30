import { countCalendarMonthsInclusive } from './gridWindow.js';
import { EXPORT_FEASIBILITY_LIMITS } from './gridPublication.js';
import { estimateLegendRows, getPublicationContentWidth, selectPublicationTextProfile, type PublicationTextProfileName } from './gridPublicationText.js';

export type GridPublicationLayout = 'week' | 'multiweek' | 'month-columns';
export type GridPublicationPlan = {
  feasible: boolean; layout: GridPublicationLayout; monthCount: number; dayCount: number; columnCount: number;
  cssWidth: number; estimatedHeight: number; eventTitleLines: number; eventLineHeight: number;
  eventPadding: number; eventBlockHeight: number; eventFontSize: number; dateFontSize: number;
  pixelRatio: number; includeAllEvents: boolean; reason: string;
  textProfile: PublicationTextProfileName; legendEstimatedRows: number;
};

const dayCount = (start: string, end: string) => Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;

export const planGridPublication = (input: { start: string; end: string; recordsByDate?: ReadonlyMap<string, readonly { title?: string }[]>; monthCount?: number; mobile?: boolean; legendEntries?: number; legendLabels?: readonly string[] }): GridPublicationPlan => {
  const days = dayCount(input.start, input.end);
  const months = input.monthCount ?? countCalendarMonthsInclusive(input.start, input.end);
  const layout: GridPublicationLayout = days <= 14 ? 'week' : days <= 45 ? 'multiweek' : 'month-columns';
  const columns = layout === 'month-columns' ? months : 7;
  const counts = [...(input.recordsByDate?.values() ?? [])].map(records => records.length).filter(Boolean).sort((a,b)=>a-b);
  const titles = [...(input.recordsByDate?.values() ?? [])].flatMap(records => records.map(record => record.title ?? '')).filter(Boolean);
  const percentile = (values: number[], fraction: number) => values.length ? values[Math.min(values.length - 1, Math.floor(values.length * fraction))] : 0;
  const maxPerDate = Math.max(0, ...counts);
  const cssWidth = getPublicationContentWidth(layout, columns);
  const profile = selectPublicationTextProfile({ layout, dayCount: days, monthCount: months, totalEventCount: titles.length, occupiedCellCount: counts.length, maxEventsPerCell: maxPerDate, medianEventsPerOccupiedCell: percentile(counts,.5), p90EventsPerOccupiedCell: percentile(counts,.9), longestTitleLength: Math.max(0,...titles.map(t=>t.length)), medianTitleLength: percentile(titles.map(t=>t.length).sort((a,b)=>a-b),.5), estimatedWidth: cssWidth });
  const lines = profile.maxLines, eventLineHeight = profile.lineHeight, eventPadding = profile.paddingY;
  const eventBlockHeight = profile.blockHeight;
  const rows = layout === 'month-columns' ? 31 : Math.ceil(days / 7);
  // Month publication renders a structural 52px minimum row and otherwise uses
  // a 16px base plus one planned block and gap per record. Keep feasibility at
  // least as conservative as the DOM that GridView captures.
  const rowHeight = layout === 'month-columns'
    ? Math.max(52, 16 + maxPerDate * (eventBlockHeight + 1))
    : Math.max(120, maxPerDate * eventBlockHeight + 38);
  const legendEstimatedRows = input.legendLabels ? estimateLegendRows(input.legendLabels, cssWidth - 64) : Math.ceil((input.legendEntries ?? 0) / 6);
  const estimatedHeight = 132 + rows * rowHeight + legendEstimatedRows * 28;
  const limits = input.mobile ? { area: EXPORT_FEASIBILITY_LIMITS.mobileArea, edge: EXPORT_FEASIBILITY_LIMITS.mobileEdge } : { area: EXPORT_FEASIBILITY_LIMITS.desktopArea, edge: EXPORT_FEASIBILITY_LIMITS.desktopEdge };
  const pixelRatio = [2, 1.5, 1].find(ratio => cssWidth * ratio <= limits.edge && estimatedHeight * ratio <= limits.edge && cssWidth * estimatedHeight * ratio * ratio <= limits.area) ?? 0;
  const feasible = pixelRatio > 0;
  return { feasible, layout, monthCount: months, dayCount: days, columnCount: columns, cssWidth, estimatedHeight, eventTitleLines: lines, eventLineHeight, eventPadding, eventBlockHeight, eventFontSize: profile.fontSize, dateFontSize: layout === 'month-columns' ? 10 : 14, pixelRatio, includeAllEvents: feasible, textProfile: profile.name, legendEstimatedRows, reason: feasible ? `${layout === 'month-columns' ? `${months}-month` : layout} layout optimized automatically` : 'This publication contains too much information for one reliable image on this device. Try a shorter range or filter Categories/Projects.' };
};
