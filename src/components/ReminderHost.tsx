import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { syncReminderSchedule } from '@/services/reminderService';
import { usePendingStore } from '@/stores/pendingStore';
import { useSettingsStore } from '@/stores/settingsStore';

export interface HomeNavigationState {
  focusInput?: boolean;
  referenceDate?: string;
}

export function ReminderHost() {
  const navigate = useNavigate();
  const refreshPending = usePendingStore((s) => s.refresh);
  const loaded = useSettingsStore((s) => s.loaded);
  const reminder = useSettingsStore((s) => s.settings.reminder);

  useEffect(() => {
    if (!loaded) return;

    const openFromNotification = (extra?: Record<string, unknown>) => {
      const state: HomeNavigationState = {};
      if (extra?.focusInput) state.focusInput = true;
      if (typeof extra?.referenceDate === 'string') {
        state.referenceDate = extra.referenceDate;
      }
      navigate('/', { state });
    };

    if (!Capacitor.isNativePlatform()) return;

    const sub = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        openFromNotification(event.notification.extra as Record<string, unknown>);
      },
    );

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshPending();
      if (reminder.enabled) void syncReminderSchedule(reminder);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      void sub.then((h) => h.remove());
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loaded, navigate, refreshPending, reminder]);

  return null;
}
