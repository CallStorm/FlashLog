import HolidayCalendar from 'holiday-calendar';
import cn2024 from 'holiday-calendar/data/CN/2024.min.json';
import cn2025 from 'holiday-calendar/data/CN/2025.min.json';
import cn2026 from 'holiday-calendar/data/CN/2026.min.json';
import { addDays } from '@/utils/date';

const BUNDLED_DATA: Record<string, typeof cn2026> = {
  'CN/2024.json': cn2024,
  'CN/2025.json': cn2025,
  'CN/2026.json': cn2026,
};

const calendar = new HolidayCalendar({
  dataLoader: async (path) => {
    const data = BUNDLED_DATA[path];
    if (!data) {
      throw new Error(`No bundled holiday data for ${path}`);
    }
    return data;
  },
});

let calendarReady = false;

export async function initCnWorkdayCalendar(): Promise<void> {
  const year = new Date().getFullYear();
  await Promise.all([
    calendar.load('CN', year).catch(() => undefined),
    calendar.load('CN', year + 1).catch(() => undefined),
    calendar.load('CN', year - 1).catch(() => undefined),
  ]);
  calendarReady = true;
}

function isWeekdayFallback(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day >= 1 && day <= 5;
}

/** 中国大陆法定工作日（含调休补班，排除节假日） */
export async function isCnWorkday(date: string): Promise<boolean> {
  const year = Number(date.slice(0, 4));
  if (year < 2024 || year > 2026) {
    return isWeekdayFallback(date);
  }
  try {
    if (!calendarReady) await initCnWorkdayCalendar();
    return await calendar.isWorkday('CN', date);
  } catch {
    return isWeekdayFallback(date);
  }
}

export function isCnWorkdayDataStale(date: string): boolean {
  const year = Number(date.slice(0, 4));
  return year < 2024 || year > 2026;
}

/** 从 start 到 end（含）遍历，仅返回中国工作日 */
export async function filterCnWorkdaysInRange(
  start: string,
  end: string,
): Promise<string[]> {
  const out: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    if (await isCnWorkday(cursor)) out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

const REMINDER_LOOKAHEAD_DAYS = 60;

/** 从 fromDate 起未来 count 个中国工作日 */
export async function upcomingCnWorkdays(
  fromDate: string,
  count: number,
): Promise<string[]> {
  const found: string[] = [];
  let cursor = fromDate;
  const limit = addDays(fromDate, REMINDER_LOOKAHEAD_DAYS);

  while (found.length < count && cursor <= limit) {
    if (await isCnWorkday(cursor)) found.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return found;
}
