import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { ReminderSettings } from '@/types/settings';
import { isCnWorkday, upcomingCnWorkdays } from '@/utils/cnWorkday';
import { getTodayLocal } from '@/utils/date';
import { getPendingCount } from '@/services/pendingWorklogService';

export const REMINDER_CHANNEL_ID = 'flashlog_reminder';
const DAILY_REMINDER_ID = 1001;
const WORKDAY_REMINDER_BASE_ID = 1100;
const WORKDAY_SCHEDULE_COUNT = 14;

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h || 18, minute: m || 0 };
}

function scheduleAt(dateStr: string, hour: number, minute: number): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d, hour, minute, 0, 0);
}

async function buildNotificationBody(): Promise<string> {
  const count = await getPendingCount();
  const today = getTodayLocal();
  if (count > 1) return `你还有 ${count} 个工作日工时未填`;
  if (count === 1) return '你还有 1 个工作日工时未填';
  if (await isCnWorkday(today)) return '记得记录今日工时';
  return 'FlashLog 工时提醒';
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

export async function requestReminderPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const ids = (pending.notifications ?? [])
    .filter((n) => {
      const id = n.id;
      return (
        id === DAILY_REMINDER_ID ||
        (id >= WORKDAY_REMINDER_BASE_ID &&
          id < WORKDAY_REMINDER_BASE_ID + WORKDAY_SCHEDULE_COUNT)
      );
    })
    .map((n) => ({ id: n.id }));
  if (ids.length > 0) {
    await LocalNotifications.cancel({ notifications: ids });
  }
}

export async function syncReminderSchedule(
  reminder: ReminderSettings,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await ensureReminderChannel();
  await cancelAllReminders();

  if (!reminder.enabled) return;

  const { hour, minute } = parseTime(reminder.time);
  const body = await buildNotificationBody();
  const today = getTodayLocal();

  if (reminder.repeat === 'daily') {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'FlashLog',
          body,
          channelId: REMINDER_CHANNEL_ID,
          schedule: {
            on: { hour, minute },
            allowWhileIdle: true,
          },
          extra: { referenceDate: today, focusInput: true },
        },
      ],
    });
    return;
  }

  const workdays = await upcomingCnWorkdays(today, WORKDAY_SCHEDULE_COUNT);
  const notifications = await Promise.all(
    workdays.map(async (date, index) => {
      const at = scheduleAt(date, hour, minute);
      if (at.getTime() <= Date.now()) return null;
      return {
        id: WORKDAY_REMINDER_BASE_ID + index,
        title: 'FlashLog',
        body: await buildNotificationBody(),
        channelId: REMINDER_CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
        extra: { referenceDate: date, focusInput: true },
      };
    }),
  );

  const valid = notifications.filter(
    (n): n is NonNullable<typeof n> => n !== null,
  );
  if (valid.length > 0) {
    await LocalNotifications.schedule({ notifications: valid });
  }
}
