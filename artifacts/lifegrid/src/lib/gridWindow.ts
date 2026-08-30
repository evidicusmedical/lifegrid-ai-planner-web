export type GridMonthKey = `${number}-${string}`;

export type GridMonthAnchor = { year: number; monthIndex: number };
export type GridMonthDescriptor = GridMonthAnchor & {
  key: GridMonthKey;
  label: string;
  startDate: string;
  endDate: string;
  daysInMonth: number;
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const monthKey = (year: number, monthIndex: number): GridMonthKey =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}` as GridMonthKey;

export const parseMonthKey = (key: string): GridMonthAnchor | null => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  return match ? { year: Number(match[1]), monthIndex: Number(match[2]) - 1 } : null;
};

export const addCalendarMonths = (anchor: GridMonthAnchor, delta: number): GridMonthAnchor => {
  const absolute = anchor.year * 12 + anchor.monthIndex + delta;
  const monthIndex = ((absolute % 12) + 12) % 12;
  return { year: Math.floor((absolute - monthIndex) / 12), monthIndex };
};

export const buildMonthWindow = (startYear: number, startMonthIndex: number, count = 12): GridMonthDescriptor[] => {
  if (!Number.isInteger(count) || count < 1) return [];
  const normalized = addCalendarMonths({ year: startYear, monthIndex: startMonthIndex }, 0);
  return Array.from({ length: count }, (_, offset) => {
    const { year, monthIndex } = addCalendarMonths(normalized, offset);
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const key = monthKey(year, monthIndex);
    return Object.freeze({ key, year, monthIndex, label: MONTH_LABELS[monthIndex], startDate: `${key}-01`, endDate: `${key}-${daysInMonth}`, daysInMonth });
  });
};

export const monthWindowDateRange = (months: readonly GridMonthDescriptor[]) => ({
  start: months[0]?.startDate ?? '',
  end: months.at(-1)?.endDate ?? '',
});

export const countCalendarMonthsInclusive = (start: string, end: string): number => {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) return 0;
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  return (endYear - startYear) * 12 + endMonth - startMonth + 1;
};

export const resolveCalendarYearWindow = (year: number) => buildMonthWindow(year, 0);
