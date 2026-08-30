import { countCalendarMonthsInclusive } from './gridWindow.js';
import { EXPORT_FEASIBILITY_LIMITS } from './gridPublication.js';

export type GridPublicationLayout = 'week' | 'multiweek' | 'month-columns';
export type GridPublicationPlan = {
  feasible: boolean; layout: GridPublicationLayout; monthCount: number; dayCount: number; columnCount: number;
  cssWidth: number; estimatedHeight: number; eventTitleLines: number; eventLineHeight: number;
  eventPadding: number; eventBlockHeight: number; eventFontSize: number; dateFontSize: number;
  pixelRatio: number; includeAllEvents: boolean; reason: string;
};

const dayCount = (start: string, end: string) => Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;

export const planGridPublication = (input: { start: string; end: string; recordsByDate?: ReadonlyMap<string, readonly unknown[]>; monthCount?: number; mobile?: boolean; legendEntries?: number }): GridPublicationPlan => {
  const days = dayCount(input.start, input.end);
  const months = input.monthCount ?? countCalendarMonthsInclusive(input.start, input.end);
  const layout: GridPublicationLayout = days <= 14 ? 'week' : days <= 45 ? 'multiweek' : 'month-columns';
  const columns = layout === 'month-columns' ? months : 7;
  const lines = layout === 'week' ? 3 : 2;
  const eventLineHeight = layout === 'week' ? 16 : 14, eventPadding = 6;
  const eventBlockHeight = lines * eventLineHeight + eventPadding * 2;
  const maxPerDate = Math.max(0, ...[...(input.recordsByDate?.values() ?? [])].map(records => records.length));
  const cssWidth = layout === 'month-columns' ? 58 + columns * 128 : 1120;
  const rows = layout === 'month-columns' ? 31 : Math.ceil(days / 7);
  const estimatedHeight = 150 + rows * Math.max(layout === 'month-columns' ? 38 : 120, maxPerDate * eventBlockHeight + 38) + Math.ceil((input.legendEntries ?? 0) / 6) * 28;
  const limits = input.mobile ? { area: EXPORT_FEASIBILITY_LIMITS.mobileArea, edge: EXPORT_FEASIBILITY_LIMITS.mobileEdge } : { area: EXPORT_FEASIBILITY_LIMITS.desktopArea, edge: EXPORT_FEASIBILITY_LIMITS.desktopEdge };
  const pixelRatio = [2, 1.5, 1].find(ratio => cssWidth * ratio <= limits.edge && estimatedHeight * ratio <= limits.edge && cssWidth * estimatedHeight * ratio * ratio <= limits.area) ?? 0;
  const feasible = pixelRatio > 0;
  return { feasible, layout, monthCount: months, dayCount: days, columnCount: columns, cssWidth, estimatedHeight, eventTitleLines: lines, eventLineHeight, eventPadding, eventBlockHeight, eventFontSize: layout === 'week' ? 12 : 10, dateFontSize: layout === 'month-columns' ? 10 : 14, pixelRatio, includeAllEvents: feasible, reason: feasible ? `${layout === 'month-columns' ? `${months}-month` : layout} layout optimized automatically` : 'This range contains too much information for one reliable image on this device. Try a shorter range or filter Categories/Projects.' };
};
