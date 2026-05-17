import { Preferences } from '@capacitor/preferences';
import { getDistinctLoggedDates } from '@/db/workLogRepository';
import { filterCnWorkdaysInRange } from '@/utils/cnWorkday';
import { getTodayLocal } from '@/utils/date';

const TRACKING_START_KEY = 'flashlog_tracking_start_v1';

export async function getTrackingStartDate(): Promise<string> {
  const { value } = await Preferences.get({ key: TRACKING_START_KEY });
  return value ?? getTodayLocal();
}

export async function setTrackingStartDateIfNeeded(): Promise<string> {
  const { value } = await Preferences.get({ key: TRACKING_START_KEY });
  if (value) return value;
  const today = getTodayLocal();
  await Preferences.set({ key: TRACKING_START_KEY, value: today });
  return today;
}

/** 清空本地数据后，待办统计从今日重新计算 */
export async function resetTrackingStartDate(): Promise<string> {
  const today = getTodayLocal();
  await Preferences.set({ key: TRACKING_START_KEY, value: today });
  return today;
}

export async function computePendingDates(
  logged?: Set<string>,
): Promise<string[]> {
  const today = getTodayLocal();
  const start = await getTrackingStartDate();
  if (start > today) return [];

  const loggedSet = logged ?? (await getDistinctLoggedDates());
  const workdays = await filterCnWorkdaysInRange(start, today);

  return workdays.filter((d) => !loggedSet.has(d)).sort((a, b) => (a < b ? 1 : -1));
}

export async function getPendingCount(): Promise<number> {
  const pending = await computePendingDates();
  return pending.length;
}
