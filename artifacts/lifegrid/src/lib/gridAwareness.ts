export type DateTemporalState = {
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
};

/** Compares ISO calendar dates rather than instants, avoiding timezone rollover bugs. */
export const getDateTemporalState = (date: string, today: string, selectedDate: string | null): DateTemporalState => ({
  isPast: date < today,
  isToday: date === today,
  isSelected: date === selectedDate,
});

export const validateExportRange = (
  range: { start: string; end: string },
  gridYear: number,
): string | null => {
  const { start, end } = range;
  if (!start || !end) return 'Choose both a start and end date.';
  if (start > end) return 'The export start date must be on or before the end date.';
  if (!start.startsWith(`${gridYear}-`) || !end.startsWith(`${gridYear}-`)) {
    return `Choose dates inside the ${gridYear} grid.`;
  }
  return null;
};

export const truncatePreviewNote = (note: string | null | undefined, limit = 180) => {
  const value = note?.trim() ?? '';
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
};
