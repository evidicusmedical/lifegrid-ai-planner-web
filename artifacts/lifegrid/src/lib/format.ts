// Human-readable date helpers (all dates are local YYYY-MM-DD strings)

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseLocal = (iso: string | null): Date | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// "Mon, Jun 15" or with year if not current year
export const formatDate = (iso: string | null, opts?: { weekday?: boolean; year?: boolean }): string => {
  if (!iso) return '';
  const d = parseLocal(iso);
  if (!d) return iso;
  const weekday = opts?.weekday !== false;
  const wd = weekday ? `${DOW_FULL[d.getDay()].slice(0, 3)}, ` : '';
  const mo = MONTHS_FULL[d.getMonth()].slice(0, 3);
  const yr = opts?.year ? `, ${d.getFullYear()}` : '';
  return `${wd}${mo} ${d.getDate()}${yr}`;
};

export const formatDateLong = (iso: string | null): string => {
  if (!iso) return '';
  const d = parseLocal(iso);
  if (!d) return iso;
  return `${DOW_FULL[d.getDay()]}, ${MONTHS_FULL[d.getMonth()]} ${ordinal(d.getDate())}`;
};

// "in 3 days", "today", "2 days ago", "tomorrow"
export const relativeDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = parseLocal(iso);
  if (!d) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
};

export const isOverdue = (iso: string | null): boolean => {
  const d = parseLocal(iso);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
