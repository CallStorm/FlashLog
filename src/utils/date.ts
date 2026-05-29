export function getTodayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export function formatDateLabel(date: string): string {
  const today = getTodayLocal();
  if (date === today) return '今天';
  const yesterday = addDays(today, -1);
  if (date === yesterday) return '昨天';
  const [y, m, d] = date.split('-');
  return `${Number(m)}月${Number(d)}日 · ${y}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-');
}

export function groupByDate<T extends { date: string }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.date) ?? [];
    list.push(item);
    map.set(item.date, list);
  }
  return map;
}

export function recentDates(days = 30): string[] {
  const today = getTodayLocal();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(today, -i));
  }
  return dates;
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function yearAgoFrom(dateStr: string): string {
  return addDays(dateStr, -365);
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`;
}

export interface MonthRef {
  year: number;
  month: number;
}

export function recentMonths(count: number): MonthRef[] {
  const now = new Date();
  const months: MonthRef[] = [];
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  for (let i = 0; i < count; i++) {
    months.push({ year, month });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

/** Monday-first week rows; null = empty cell */
export function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // JS: 0=Sun … convert to Mon-first offset (0=Mon … 6=Sun)
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

export function filterLogsByDateRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string,
): T[] {
  return items.filter((i) => isDateInRange(i.date, start, end));
}

/** Hours label for export, e.g. 1.5h or 2h */
export function formatDurationHours(minutes: number): string {
  const h = minutes / 60;
  const rounded = Math.round(h * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}h`;
  return `${rounded}h`;
}

export function formatWeekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const index = (dt.getDay() + 6) % 7;
  return WEEKDAY_LABELS[index];
}

/** Monday of the week containing `ref` (default: today), as YYYY-MM-DD */
export function getWeekStartMonday(ref?: string): string {
  const anchor = ref ?? getTodayLocal();
  const [y, m, d] = anchor.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const mondayOffset = (dt.getDay() + 6) % 7;
  return addDays(anchor, -mondayOffset);
}

export function daysBetweenInclusive(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const a = new Date(sy, sm - 1, sd).getTime();
  const b = new Date(ey, em - 1, ed).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

export const WEEKDAY_LABELS_SHORT = WEEKDAY_LABELS;

/** Full calendar week Mon~Sun containing `ref` (default today). */
export function getWeekRangeMondaySunday(ref?: string): {
  start: string;
  end: string;
} {
  const start = getWeekStartMonday(ref);
  return { start, end: addDays(start, 6) };
}

export function getLastWeekRangeMondaySunday(ref?: string): {
  start: string;
  end: string;
} {
  const { start } = getWeekRangeMondaySunday(ref);
  const lastStart = addDays(start, -7);
  return { start: lastStart, end: addDays(lastStart, 6) };
}

export function getThisMonthRange(ref?: string): { start: string; end: string } {
  const anchor = ref ?? getTodayLocal();
  const [y, m] = anchor.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getLastMonthRange(ref?: string): { start: string; end: string } {
  const anchor = ref ?? getTodayLocal();
  const [y, m] = anchor.split('-').map(Number);
  let year = y;
  let month = m - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function formatRangeLabel(start: string, end: string): string {
  const fmt = (d: string) => {
    const [, m, day] = d.split('-');
    return `${Number(m)}/${Number(day)}（${formatWeekday(d)}）`;
  };
  if (start === end) return fmt(start);
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export interface DailyTotal {
  date: string;
  minutes: number;
  weekday: string;
}

/** Seven entries Mon~Sun for the week containing weekStart (Monday). */
export function fillDailyTotalsForWeek(
  logs: { date: string; durationMinutes: number }[],
  weekStart: string,
): DailyTotal[] {
  const byDate = new Map<string, number>();
  for (const log of logs) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.durationMinutes);
  }
  const out: DailyTotal[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    out.push({
      date,
      minutes: byDate.get(date) ?? 0,
      weekday: WEEKDAY_LABELS[i],
    });
  }
  return out;
}

export function iterDatesInclusive(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}
