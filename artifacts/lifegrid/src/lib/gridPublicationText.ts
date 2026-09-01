export type PublicationTextProfileName = 'relaxed' | 'standard' | 'dense';

export type PublicationTextProfile = {
  name: PublicationTextProfileName;
  maxLines: number;
  fontSize: number;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
  blockHeight: number;
};

export const PUBLICATION_TEXT_PROFILES: Record<PublicationTextProfileName, PublicationTextProfile> = {
  relaxed: { name: 'relaxed', maxLines: 3, fontSize: 11, lineHeight: 15, paddingX: 6, paddingY: 5, blockHeight: 55 },
  standard: { name: 'standard', maxLines: 3, fontSize: 9.5, lineHeight: 13, paddingX: 5, paddingY: 4, blockHeight: 47 },
  dense: { name: 'dense', maxLines: 2, fontSize: 8.5, lineHeight: 11, paddingX: 4, paddingY: 3, blockHeight: 28 },
};

export type PublicationDensity = {
  layout: 'week' | 'multiweek' | 'month-columns'; dayCount: number; monthCount: number;
  totalEventCount: number; occupiedCellCount: number; maxEventsPerCell: number;
  medianEventsPerOccupiedCell: number; p90EventsPerOccupiedCell: number;
  longestTitleLength: number; medianTitleLength: number; estimatedWidth: number;
};

export const selectPublicationTextProfile = (density: PublicationDensity): PublicationTextProfile => {
  const eventsPerDay = density.totalEventCount / Math.max(1, density.dayCount);
  const annualPressure = density.dayCount > 180 && (density.totalEventCount >= 120 || density.p90EventsPerOccupiedCell >= 3);
  const densePressure = eventsPerDay >= 1.25 || density.maxEventsPerCell >= 5 || density.medianEventsPerOccupiedCell >= 3;
  if (annualPressure || densePressure) return PUBLICATION_TEXT_PROFILES.dense;
  if (density.dayCount <= 14 && eventsPerDay <= 1 && density.maxEventsPerCell <= 2) return PUBLICATION_TEXT_PROFILES.relaxed;
  return PUBLICATION_TEXT_PROFILES.standard;
};

export const fitPublicationTitle = (input: {
  text: string; availableWidth: number; profile: PublicationTextProfile;
  measureText: (text: string, fontSize?: number) => number; reservedWidth?: number;
}) => {
  const width = Math.max(1, input.availableWidth - (input.reservedWidth ?? 0) - input.profile.paddingX * 2);
  const words = input.text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let word of words) {
    while (input.measureText(word, input.profile.fontSize) > width && word.length > 1) {
      let cut = 1;
      while (cut < word.length && input.measureText(word.slice(0, cut + 1), input.profile.fontSize) <= width) cut++;
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, cut)); word = word.slice(cut);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (line && input.measureText(candidate, input.profile.fontSize) > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  const truncated = lines.length > input.profile.maxLines;
  const result = lines.slice(0, input.profile.maxLines);
  if (truncated) {
    let final = result[result.length - 1] ?? '';
    while (final && input.measureText(`${final}…`, input.profile.fontSize) > width) final = final.slice(0, -1);
    result[result.length - 1] = `${final.trimEnd()}…`;
  }
  return { lines: result, text: result.join('\n'), truncated, availableWidth: width };
};

export const estimateLegendRows = (labels: readonly string[], availableWidth: number, measureText: (text: string) => number = text => text.length * 7) => {
  if (!labels.length) return 0;
  const gap = 12, swatchAndGap = 22;
  let rows = 1, used = 0;
  labels.forEach(label => {
    const entry = Math.min(availableWidth, swatchAndGap + measureText(label));
    if (used > 0 && used + gap + entry > availableWidth) { rows++; used = entry; }
    else used += (used ? gap : 0) + entry;
  });
  return rows;
};

export const getPublicationContentWidth = (layout: PublicationDensity['layout'], monthCount: number) =>
  layout === 'month-columns' ? getMonthPublicationWidth(monthCount) : 1120;

export const getPublicationCaptureBounds = (node: HTMLElement) => ({
  width: Math.ceil(Math.max(node.getBoundingClientRect().width, node.scrollWidth)),
  height: Math.ceil(Math.max(node.getBoundingClientRect().height, node.scrollHeight)),
});
import { getMonthPublicationWidth } from './gridPublicationGeometry.js';
export interface PublicationTextLayoutOptions {
  text: string;
  maxWidth: number;
  maxLines: number;
  measureText: (text: string) => number;
  breakOversizedTokens?: boolean;
  balanceFinalLine?: boolean;
}

export interface PublicationTextLayout {
  lines: string[];
  truncated: boolean;
  usedInternalTokenBreak: boolean;
  balancedFinalLine: boolean;
}

const ORPHAN_TOKENS = new Set(["/", "&", "-", "("]);

/** Pure, metric-driven publication wrapping shared by Canvas and contract tests. */
export const layoutPublicationTextLines = ({
  text,
  maxWidth,
  maxLines,
  measureText,
  breakOversizedTokens = true,
  balanceFinalLine = true,
}: PublicationTextLayoutOptions): PublicationTextLayout => {
  if (maxWidth <= 0 || maxLines <= 0) return { lines: [], truncated: text.trim().length > 0, usedInternalTokenBreak: false, balancedFinalLine: false };
  const tokens = text.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let usedInternalTokenBreak = false;

  const pushToken = (sourceToken: string) => {
    let token = sourceToken;
    if (breakOversizedTokens && measureText(token) > maxWidth) {
      if (line) { lines.push(line); line = ""; }
      usedInternalTokenBreak = true;
      while (token && measureText(token) > maxWidth) {
        let low = 1, high = token.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          if (measureText(token.slice(0, mid)) <= maxWidth) low = mid; else high = mid - 1;
        }
        const cut = Math.max(1, low);
        lines.push(token.slice(0, cut));
        token = token.slice(cut);
      }
      line = token;
      return;
    }
    const candidate = line ? `${line} ${token}` : token;
    if (line && measureText(candidate) > maxWidth) { lines.push(line); line = token; }
    else line = candidate;
  };
  tokens.forEach(pushToken);
  if (line) lines.push(line);

  let balancedFinalLine = false;
  if (balanceFinalLine && lines.length >= 2) {
    const lastIndex = lines.length - 1;
    const lastTokens = lines[lastIndex].split(" ");
    const lastWidth = measureText(lines[lastIndex]);
    const shortOrphan = lastTokens.length === 1 && (lastTokens[0].length <= 2 || ORPHAN_TOKENS.has(lastTokens[0]));
    if (shortOrphan || lastWidth / maxWidth < 0.3) {
      const previousTokens = lines[lastIndex - 1].split(" ");
      for (const moveCount of [1, 2]) {
        if (previousTokens.length <= moveCount) continue;
        const revisedPrevious = previousTokens.slice(0, -moveCount).join(" ");
        const revisedLast = [...previousTokens.slice(-moveCount), ...lastTokens].join(" ");
        if (measureText(revisedPrevious) > maxWidth || measureText(revisedLast) > maxWidth) continue;
        const oldMinimum = Math.min(measureText(lines[lastIndex - 1]), lastWidth);
        const newMinimum = Math.min(measureText(revisedPrevious), measureText(revisedLast));
        if (newMinimum > oldMinimum) {
          lines[lastIndex - 1] = revisedPrevious;
          lines[lastIndex] = revisedLast;
          balancedFinalLine = true;
          break;
        }
      }
    }
  }

  const truncated = lines.length > maxLines;
  if (truncated) {
    lines.length = maxLines;
    let final = lines[maxLines - 1].trimEnd();
    while (final && measureText(`${final}…`) > maxWidth) {
      const boundary = final.lastIndexOf(" ");
      final = boundary >= 0 ? final.slice(0, boundary) : final.slice(0, -1);
    }
    lines[maxLines - 1] = `${final}…`;
  }
  return { lines, truncated, usedInternalTokenBreak, balancedFinalLine };
};
