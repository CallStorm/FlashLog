import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';
import type { ReminderSettings } from '@/types/settings';
import { upcomingCnWorkdays } from '@/utils/cnWorkday';
import { addDays, getTodayLocal } from '@/utils/date';
import { getPendingCount } from '@/services/pendingWorklogService';

export const REMINDER_CHANNEL_ID = 'flashlog_reminder';
const DAILY_REMINDER_BASE_ID = 1001;
const DAILY_SCHEDULE_COUNT = 30;
const WORKDAY_REMINDER_BASE_ID = 1100;
const WORKDAY_SCHEDULE_COUNT = 14;
const RESCHEDULE_PENDING_THRESHOLD = 7;
const LAST_REMINDER_SYNC_KEY = 'flashlog_reminder_last_sync_v1';

export type ReminderSyncResult =
  | { ok: true; scheduled: number }
  | { ok: false; reason: string };

export interface ReminderDiagnostics {
  notificationGranted: boolean;
  exactAlarmGranted: boolean;
  pendingCount: number;
  nextFireAt: string | null;
  lastSyncDate: string | null;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h || 18, minute: m || 0 };
}

function scheduleAt(dateStr: string, hour: number, minute: number): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d, hour, minute, 0, 0);
}

export function isFlashLogReminderId(id: number): boolean {
  return (
    (id >= DAILY_REMINDER_BASE_ID &&
      id < DAILY_REMINDER_BASE_ID + DAILY_SCHEDULE_COUNT) ||
    (id >= WORKDAY_REMINDER_BASE_ID &&
      id < WORKDAY_REMINDER_BASE_ID + WORKDAY_SCHEDULE_COUNT)
  );
}

async function buildNotificationBody(): Promise<string> {
  const count = await getPendingCount();
  if (count > 1) return `你还有 ${count} 个工作日工时未填`;
  if (count === 1) return '你还有 1 个工作日工时未填';
  return '记得记录今日工时';
}

export async function ensureReminderChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: '工时提醒',
    importance: 4,
    visibility: 1,
  });
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const current = await LocalNotifications.checkPermissions();
  return current.display === 'granted';
}

export async function checkExactAlarmPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const status = await LocalNotifications.checkExactNotificationSetting();
  return status.exact_alarm === 'granted';
}

export async function requestExactAlarmPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (await checkExactAlarmPermission()) return true;
  await LocalNotifications.changeExactNotificationSetting();
  return checkExactAlarmPermission();
}

export async function ensureReminderPermissions(): Promise<{
  notification: boolean;
  exactAlarm: boolean;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { notification: false, exactAlarm: false };
  }
  let notification = await checkNotificationPermission();
  if (!notification) {
    const result = await LocalNotifications.requestPermissions();
    notification = result.display === 'granted';
  }
  let exactAlarm = await checkExactAlarmPermission();
  if (notification && !exactAlarm) {
    exactAlarm = await requestExactAlarmPermission();
  }
  return { notification, exactAlarm };
}

export async function requestReminderPermission(): Promise<boolean> {
  const { notification, exactAlarm } = await ensureReminderPermissions();
  return notification && exactAlarm;
}

async function getLastSyncDate(): Promise<string | null> {
  const { value } = await Preferences.get({ key: LAST_REMINDER_SYNC_KEY });
  return value ?? null;
}

async function setLastSyncDate(date: string): Promise<void> {
  await Preferences.set({ key: LAST_REMINDER_SYNC_KEY, value: date });
}

async function upcomingScheduleDates(
  reminder: ReminderSettings,
  fromDate: string,
): Promise<string[]> {
  if (reminder.repeat === 'daily') {
    const dates: string[] = [];
    for (let i = 0; i < DAILY_SCHEDULE_COUNT; i++) {
      dates.push(addDays(fromDate, i));
    }
    return dates;
  }
  return upcomingCnWorkdays(fromDate, WORKDAY_SCHEDULE_COUNT);
}

async function buildScheduledNotifications(
  reminder: ReminderSettings,
): Promise<LocalNotificationSchema[]> {
  const { hour, minute } = parseTime(reminder.time);
  const today = getTodayLocal();
  const dates = await upcomingScheduleDates(reminder, today);
  const baseId =
    reminder.repeat === 'daily'
      ? DAILY_REMINDER_BASE_ID
      : WORKDAY_REMINDER_BASE_ID;
  const now = Date.now();

  const notifications: LocalNotificationSchema[] = [];
  for (let index = 0; index < dates.length; index++) {
    const date = dates[index];
    const at = scheduleAt(date, hour, minute);
    if (at.getTime() <= now) continue;

    notifications.push({
      id: baseId + index,
      title: 'FlashLog',
      body: await buildNotificationBody(),
      channelId: REMINDER_CHANNEL_ID,
      schedule: { at, allowWhileIdle: true },
      extra: { referenceDate: date, focusInput: true },
    });
  }
  return notifications;
}

export async function countFlashLogPending(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  const pending = await LocalNotifications.getPending();
  return (pending.notifications ?? []).filter((n) =>
    isFlashLogReminderId(n.id),
  ).length;
}

function parsePendingFireAt(schedule?: { at?: Date | string }): Date | null {
  const at = schedule?.at;
  if (!at) return null;
  const d = at instanceof Date ? at : new Date(at);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getReminderDiagnostics(): Promise<ReminderDiagnostics> {
  if (!Capacitor.isNativePlatform()) {
    return {
      notificationGranted: false,
      exactAlarmGranted: false,
      pendingCount: 0,
      nextFireAt: null,
      lastSyncDate: null,
    };
  }

  const [notificationGranted, exactAlarmGranted, lastSyncDate] =
    await Promise.all([
      checkNotificationPermission(),
      checkExactAlarmPermission(),
      getLastSyncDate(),
    ]);

  const pending = await LocalNotifications.getPending();
  const ours = (pending.notifications ?? []).filter((n) =>
    isFlashLogReminderId(n.id),
  );

  let nextFireAt: string | null = null;
  let minMs = Infinity;
  for (const n of ours) {
    const d = parsePendingFireAt(n.schedule);
    if (d && d.getTime() < minMs) {
      minMs = d.getTime();
      nextFireAt = d.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return {
    notificationGranted,
    exactAlarmGranted,
    pendingCount: ours.length,
    nextFireAt,
    lastSyncDate,
  };
}

export async function shouldRescheduleReminders(
  enabled: boolean,
): Promise<boolean> {
  if (!enabled || !Capacitor.isNativePlatform()) return false;

  const today = getTodayLocal();
  const lastSync = await getLastSyncDate();
  if (lastSync !== today) return true;

  const count = await countFlashLogPending();
  return count < RESCHEDULE_PENDING_THRESHOLD;
}

export async function cancelReminderIds(ids: number[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || ids.length === 0) return;
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const ids = (pending.notifications ?? [])
    .filter((n) => isFlashLogReminderId(n.id))
    .map((n) => n.id);
  await cancelReminderIds(ids);
}

export async function syncReminderSchedule(
  reminder: ReminderSettings,
): Promise<ReminderSyncResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: '非原生平台' };
  }

  await ensureReminderChannel();

  if (!reminder.enabled) {
    await cancelAllReminders();
    return { ok: true, scheduled: 0 };
  }

  const { notification, exactAlarm } = await ensureReminderPermissions();
  if (!notification) {
    return { ok: false, reason: '未授予通知权限' };
  }
  if (!exactAlarm) {
    return {
      ok: false,
      reason: '未授予精确闹钟权限，退出应用后可能无法准时提醒',
    };
  }

  const notifications = await buildScheduledNotifications(reminder);
  if (notifications.length === 0) {
    return { ok: false, reason: '没有可排程的未来提醒时间' };
  }

  const pending = await LocalNotifications.getPending();
  const oldIds = (pending.notifications ?? [])
    .filter((n) => isFlashLogReminderId(n.id))
    .map((n) => n.id);
  const newIds = new Set(notifications.map((n) => n.id));

  try {
    await LocalNotifications.schedule({ notifications });
  } catch {
    return { ok: false, reason: '系统拒绝排程通知' };
  }

  const pendingAfter = await countFlashLogPending();
  if (pendingAfter < 1) {
    return { ok: false, reason: '排程后未检测到待触发提醒' };
  }

  const toCancel = oldIds.filter((id) => !newIds.has(id));
  await cancelReminderIds(toCancel);

  await setLastSyncDate(getTodayLocal());
  return { ok: true, scheduled: notifications.length };
}
