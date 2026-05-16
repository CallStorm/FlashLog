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
