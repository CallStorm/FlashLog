import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { DEFAULT_SETTINGS, TTS_SPEAKER_OPTIONS } from '@/constants/defaults';
import { REMINDER_COPY, SETTINGS_COPY } from '@/constants/settingsCopy';
import { clearAllWorkLogs } from '@/db/workLogRepository';
import { useDraftStore } from '@/stores/draftStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import { Toast } from '@/components/Toast';
import { WorkCategorySettingsSection } from '@/components/WorkCategorySettingsSection';
import { resetTrackingStartDate } from '@/services/pendingWorklogService';
import {
  getReminderDiagnostics,
  requestExactAlarmPermission,
  requestReminderPermission,
  syncReminderSchedule,
  type ReminderDiagnostics,
} from '@/services/reminderService';
import { refreshPendingWorklogs } from '@/utils/refreshPending';
import type { ReminderRepeat } from '@/types/settings';

export function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const {
    settings,
    loaded,
    load,
    llmKeyConfigured,
    asrConfigured,
    updateLlm,
    updateAsr,
    updateTts,
    updateSettings,
    setLlmApiKeyValue,
    setAsrApiKeyValue,
    restoreLlmDefaults,
  } = useSettingsStore();
  const resetDraft = useDraftStore((s) => s.resetAll);

  const [llmKeyInput, setLlmKeyInput] = useState('');
  const [asrKeyInput, setAsrKeyInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [reminderDiag, setReminderDiag] = useState<ReminderDiagnostics | null>(
    null,
  );

  const reminderTimeForInput =
    settings.reminder.time.length >= 5 ? settings.reminder.time : '18:00';

  const refreshReminderDiag = async () => {
    if (!Capacitor.isNativePlatform()) return;
    setReminderDiag(await getReminderDiagnostics());
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        setToast(REMINDER_COPY.permissionDenied);
        void refreshReminderDiag();
        return;
      }
    }
    const result = await updateSettings({
      reminder: { ...settings.reminder, enabled },
    });
    void refreshReminderDiag();
    if (enabled && result && !result.ok) {
      setToast(result.reason);
      return;
    }
    setToast(enabled ? REMINDER_COPY.enabled : REMINDER_COPY.disabled);
  };

  const handleReminderTimeChange = (value: string) => {
    void (async () => {
      const result = await updateSettings({
        reminder: { ...settings.reminder, time: value || '18:00' },
      });
      void refreshReminderDiag();
      if (result && !result.ok) setToast(result.reason);
    })();
  };

  const handleReminderRepeat = (repeat: ReminderRepeat) => {
    void (async () => {
      const result = await updateSettings({
        reminder: { ...settings.reminder, repeat },
      });
      void refreshReminderDiag();
      if (result && !result.ok) setToast(result.reason);
    })();
  };

  const handleOpenExactAlarmSettings = () => {
    void (async () => {
      await requestExactAlarmPermission();
      void refreshReminderDiag();
      const result = await syncReminderSchedule(settings.reminder);
      if (!result.ok) setToast(result.reason);
      else if (settings.reminder.enabled) setToast(REMINDER_COPY.rescheduled);
    })();
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loaded || !settings.reminder.enabled) {
      setReminderDiag(null);
      return;
    }
    void refreshReminderDiag();
  }, [
    loaded,
    settings.reminder.enabled,
    settings.reminder.time,
    settings.reminder.repeat,
  ]);

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        {SETTINGS_COPY.loading}
      </div>
    );
  }

  const handleSaveLlmKey = async () => {
    await setLlmApiKeyValue(llmKeyInput.trim());
    setLlmKeyInput('');
    setToast(SETTINGS_COPY.llmKeySaved);
  };

  const handleSaveAsrKey = async () => {
    await setAsrApiKeyValue(asrKeyInput.trim());
    setAsrKeyInput('');
    setToast(SETTINGS_COPY.asrKeySaved);
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAllWorkLogs();
    resetDraft();
    await resetTrackingStartDate();
    await refreshPendingWorklogs();
    if (settings.reminder.enabled) {
      await syncReminderSchedule(settings.reminder);
    }
    setConfirmClear(false);
    setToast(SETTINGS_COPY.dataCleared);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="page-title">{SETTINGS_COPY.pageTitle}</h1>
        <p className="mt-1 text-sm text-muted">{SETTINGS_COPY.pageSubtitle}</p>
      </header>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">{SETTINGS_COPY.appearanceTitle}</h2>
        <p className="text-xs text-muted">{SETTINGS_COPY.appearanceHint}</p>
        <div className="theme-segment" role="group" aria-label={SETTINGS_COPY.themeGroup}>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`theme-segment-btn ${theme === 'light' ? 'theme-segment-btn-active' : ''}`}
          >
            {SETTINGS_COPY.themeLight}
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`theme-segment-btn ${theme === 'dark' ? 'theme-segment-btn-active' : ''}`}
          >
            {SETTINGS_COPY.themeDark}
          </button>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">{SETTINGS_COPY.llmTitle}</h2>
          <button
            type="button"
            onClick={() => void restoreLlmDefaults()}
            className="flex items-center gap-1 text-xs text-secondary hover:text-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {SETTINGS_COPY.restoreVolcDefaults}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">API Base URL</span>
          <input
            value={settings.llm.baseUrl}
            onChange={(e) => void updateLlm({ baseUrl: e.target.value })}
            className="input-field"
          />
        </label>

        <div className="block space-y-1">
          <span className="label-field">{SETTINGS_COPY.apiKeyLabel}</span>
          <input
            type="password"
            value={llmKeyInput}
            onChange={(e) => setLlmKeyInput(e.target.value)}
            placeholder={
              llmKeyConfigured
                ? SETTINGS_COPY.apiKeyPlaceholderNew
                : SETTINGS_COPY.apiKeyPlaceholder
            }
            className="input-field w-full"
            autoComplete="off"
          />
          {llmKeyConfigured && (
            <p className="text-xs text-muted">{SETTINGS_COPY.apiKeySavedHint}</p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveLlmKey()}
            disabled={!llmKeyInput.trim()}
            className="btn-secondary mt-2 w-full"
          >
            {SETTINGS_COPY.save}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">{SETTINGS_COPY.modelLabel}</span>
          <input
            value={settings.llm.model}
            onChange={(e) => void updateLlm({ model: e.target.value })}
            placeholder={SETTINGS_COPY.modelPlaceholder}
            className="input-field"
          />
        </label>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">{SETTINGS_COPY.asrTitle}</h2>
        <p className="text-xs text-muted">
          {SETTINGS_COPY.asrAuthHint}{' '}
          <a
            href="https://www.volcengine.com/docs/6561/1354869?lang=zh"
            target="_blank"
            rel="noreferrer"
            className="link-accent"
          >
            {SETTINGS_COPY.asrDocLink}
          </a>
        </p>

        <div className="block space-y-1">
          <span className="label-field">{SETTINGS_COPY.asrKeyLabel}</span>
          <input
            type="password"
            value={asrKeyInput}
            onChange={(e) => setAsrKeyInput(e.target.value)}
            placeholder={
              asrConfigured
                ? SETTINGS_COPY.apiKeyPlaceholderNew
                : SETTINGS_COPY.apiKeyPlaceholder
            }
            className="input-field w-full"
            autoComplete="off"
          />
          {asrConfigured && (
            <p className="text-xs text-muted">{SETTINGS_COPY.apiKeySavedHint}</p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveAsrKey()}
            disabled={!asrKeyInput.trim()}
            className="btn-secondary mt-2 w-full"
          >
            {SETTINGS_COPY.save}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">{SETTINGS_COPY.resourceIdLabel}</span>
          <input
            value={settings.asr.resourceId}
            onChange={(e) => void updateAsr({ resourceId: e.target.value })}
            placeholder={DEFAULT_SETTINGS.asr.resourceId}
            className="input-field"
          />
        </label>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">{SETTINGS_COPY.ttsTitle}</h2>
        <p className="text-xs text-muted">
          {SETTINGS_COPY.ttsAuthHint}{' '}
          <a
            href="https://www.volcengine.com/docs/6561/1329505?lang=zh"
            target="_blank"
            rel="noreferrer"
            className="link-accent"
          >
            {SETTINGS_COPY.ttsDocLink}
          </a>
        </p>
        <p className="text-xs text-muted">{SETTINGS_COPY.ttsKeyHint}</p>

        <label className="block space-y-1">
          <span className="label-field">{SETTINGS_COPY.ttsResourceIdLabel}</span>
          <input
            value={settings.tts.resourceId}
            onChange={(e) => void updateTts({ resourceId: e.target.value })}
            placeholder={DEFAULT_SETTINGS.tts.resourceId}
            className="input-field"
          />
        </label>

        <label className="block space-y-1">
          <span className="label-field">{SETTINGS_COPY.ttsSpeakerLabel}</span>
          <select
            value={settings.tts.speaker}
            onChange={(e) => void updateTts({ speaker: e.target.value })}
            className="input-field"
          >
            {TTS_SPEAKER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <span className="label-field block">{SETTINGS_COPY.ttsModelLabel}</span>
          <div className="theme-segment" role="group" aria-label={SETTINGS_COPY.ttsModelLabel}>
            <button
              type="button"
              onClick={() => void updateTts({ model: 'seed-tts-2.0-standard' })}
              className={`theme-segment-btn ${settings.tts.model === 'seed-tts-2.0-standard' ? 'theme-segment-btn-active' : ''}`}
            >
              {SETTINGS_COPY.ttsModelStandard}
            </button>
            <button
              type="button"
              onClick={() => void updateTts({ model: 'seed-tts-2.0-expressive' })}
              className={`theme-segment-btn ${settings.tts.model === 'seed-tts-2.0-expressive' ? 'theme-segment-btn-active' : ''}`}
            >
              {SETTINGS_COPY.ttsModelExpressive}
            </button>
          </div>
        </div>
      </section>

      <WorkCategorySettingsSection
        workCategories={settings.workCategories}
        onChange={(workCategories) =>
          void updateSettings({ workCategories })
        }
        onToast={setToast}
      />

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">{REMINDER_COPY.sectionTitle}</h2>
        <p className="text-xs text-muted">{REMINDER_COPY.intro}</p>
        <p className="text-xs text-muted">{REMINDER_COPY.repeatHint}</p>
        {settings.reminder.enabled && reminderDiag && (
          <div className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-secondary space-y-1">
            <p>
              {REMINDER_COPY.notificationPermission}
              {REMINDER_COPY.colon}
              {reminderDiag.notificationGranted
                ? REMINDER_COPY.granted
                : REMINDER_COPY.denied}
            </p>
            <p>
              {REMINDER_COPY.exactAlarmPermission}
              {REMINDER_COPY.colon}
              {reminderDiag.exactAlarmGranted
                ? REMINDER_COPY.granted
                : REMINDER_COPY.denied}
            </p>
            <p>{REMINDER_COPY.pendingCount(reminderDiag.pendingCount)}</p>
            {reminderDiag.nextFireAt && (
              <p>{REMINDER_COPY.nextFire(reminderDiag.nextFireAt)}</p>
            )}
            {!reminderDiag.exactAlarmGranted && (
              <button
                type="button"
                onClick={handleOpenExactAlarmSettings}
                className="mt-1 text-accent underline"
              >
                {REMINDER_COPY.openExactAlarm}
              </button>
            )}
          </div>
        )}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.reminder.enabled}
            onChange={(e) => void handleReminderToggle(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          <span className="text-sm text-secondary">{REMINDER_COPY.toggleLabel}</span>
        </label>
        <label className="block space-y-1">
          <span className="label-field">{REMINDER_COPY.timeLabel}</span>
          <input
            type="time"
            value={reminderTimeForInput}
            onChange={(e) => handleReminderTimeChange(e.target.value)}
            disabled={!settings.reminder.enabled}
            className="input-field"
          />
        </label>
        <div className="space-y-2">
          <span className="label-field block">{REMINDER_COPY.repeatLabel}</span>
          <div className="theme-segment" role="group" aria-label={REMINDER_COPY.repeatGroup}>
            <button
              type="button"
              disabled={!settings.reminder.enabled}
              onClick={() => handleReminderRepeat('weekdays')}
              className={`theme-segment-btn ${settings.reminder.repeat === 'weekdays' ? 'theme-segment-btn-active' : ''}`}
            >
              {REMINDER_COPY.weekdays}
            </button>
            <button
              type="button"
              disabled={!settings.reminder.enabled}
              onClick={() => handleReminderRepeat('daily')}
              className={`theme-segment-btn ${settings.reminder.repeat === 'daily' ? 'theme-segment-btn-active' : ''}`}
            >
              {REMINDER_COPY.daily}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => void handleClearData()}
          className={`btn-danger-outline ${confirmClear ? 'btn-danger-confirm' : ''}`}
        >
          <Trash2 className="h-4 w-4" />
          {confirmClear ? SETTINGS_COPY.clearDataConfirm : SETTINGS_COPY.clearData}
        </button>
        <p className="text-center text-xs text-muted">{SETTINGS_COPY.clearDataHint}</p>
      </section>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="btn-primary w-full"
      >
        {SETTINGS_COPY.backToHome}
      </button>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast(null)} />
      )}
    </div>
  );
}
