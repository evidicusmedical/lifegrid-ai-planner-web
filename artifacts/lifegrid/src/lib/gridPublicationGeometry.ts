export const GRID_DAY_COLUMN_WIDTH = 32;
export const GRID_MONTH_COLUMN_WIDTH = 110;
export const PUBLICATION_HORIZONTAL_PADDING = 24;

export const getMonthTableWidth = (monthCount: number) =>
  GRID_DAY_COLUMN_WIDTH + Math.max(1, monthCount) * GRID_MONTH_COLUMN_WIDTH;

export const getMonthPublicationWidth = (monthCount: number) =>
  getMonthTableWidth(monthCount) + PUBLICATION_HORIZONTAL_PADDING * 2;
