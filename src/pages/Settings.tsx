import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Trash2 } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import { clearAllWorkLogs } from '@/db/workLogRepository';
import { useDraftStore } from '@/stores/draftStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import { Toast } from '@/components/Toast';
import { requestReminderPermission } from '@/services/reminderService';
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

  const reminderTimeForInput =
    settings.reminder.time.length >= 5 ? settings.reminder.time : '18:00';

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        setToast('请在系统设置中允许通知权限');
        return;
      }
    }
    await updateSettings({
      reminder: { ...settings.reminder, enabled },
    });
    setToast(enabled ? '已开启定时提醒' : '已关闭定时提醒');
  };

  const handleReminderTimeChange = (value: string) => {
    void updateSettings({
      reminder: { ...settings.reminder, time: value || '18:00' },
    });
  };

  const handleReminderRepeat = (repeat: ReminderRepeat) => {
    void updateSettings({
      reminder: { ...settings.reminder, repeat },
    });
  };

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        加载中…
      </div>
    );
  }

  const handleSaveLlmKey = async () => {
    await setLlmApiKeyValue(llmKeyInput.trim());
    setLlmKeyInput('');
    setToast('LLM API Key 已保存');
  };

  const handleSaveAsrKey = async () => {
    await setAsrApiKeyValue(asrKeyInput.trim());
    setAsrKeyInput('');
    setToast('ASR API Key 已保存');
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAllWorkLogs();
    resetDraft();
    await refreshPendingWorklogs();
    setConfirmClear(false);
    setToast('本地工时与草稿已清除');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="page-title">设置</h1>
        <p className="mt-1 text-sm text-muted">
          API 调用费用由您自行承担，密钥仅存于本机安全存储。
        </p>
      </header>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">外观</h2>
        <p className="text-xs text-muted">选择界面配色，将记住您的选择</p>
        <div className="theme-segment" role="group" aria-label="主题">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`theme-segment-btn ${theme === 'light' ? 'theme-segment-btn-active' : ''}`}
          >
            浅色
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`theme-segment-btn ${theme === 'dark' ? 'theme-segment-btn-active' : ''}`}
          >
            深色
          </button>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">LLM · 火山方舟</h2>
          <button
            type="button"
            onClick={() => void restoreLlmDefaults()}
            className="flex items-center gap-1 text-xs text-secondary hover:text-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复火山默认
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
          <span className="label-field">API Key（脱敏存储）</span>
          <input
            type="password"
            value={llmKeyInput}
            onChange={(e) => setLlmKeyInput(e.target.value)}
            placeholder={llmKeyConfigured ? '输入新 Key 覆盖' : '输入 API Key'}
            className="input-field w-full"
            autoComplete="off"
          />
          {llmKeyConfigured && (
            <p className="text-xs text-muted">已保存 Key，输入新值可覆盖</p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveLlmKey()}
            disabled={!llmKeyInput.trim()}
            className="btn-secondary mt-2 w-full"
          >
            保存
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">Model / Endpoint ID（必填）</span>
          <input
            value={settings.llm.model}
            onChange={(e) => void updateLlm({ model: e.target.value })}
            placeholder="ep-xxxxxxxx 或 doubao-1-5-pro-32k-250115"
            className="input-field"
          />
        </label>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">ASR · 火山豆包语音</h2>
        <p className="text-xs text-muted">
          新版控制台鉴权，见{' '}
          <a
            href="https://www.volcengine.com/docs/6561/1354869?lang=zh"
            target="_blank"
            rel="noreferrer"
            className="link-accent"
          >
            大模型流式语音识别
          </a>
        </p>

        <div className="block space-y-1">
          <span className="label-field">API Key（X-Api-Key）</span>
          <input
            type="password"
            value={asrKeyInput}
            onChange={(e) => setAsrKeyInput(e.target.value)}
            placeholder={asrConfigured ? '输入新 Key 覆盖' : '输入 API Key'}
            className="input-field w-full"
            autoComplete="off"
          />
          {asrConfigured && (
            <p className="text-xs text-muted">已保存 Key，输入新值可覆盖</p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveAsrKey()}
            disabled={!asrKeyInput.trim()}
            className="btn-secondary mt-2 w-full"
          >
            保存
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">Resource ID（X-Api-Resource-Id）</span>
          <input
            value={settings.asr.resourceId}
            onChange={(e) => void updateAsr({ resourceId: e.target.value })}
            placeholder={DEFAULT_SETTINGS.asr.resourceId}
            className="input-field"
          />
        </label>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">定时提醒</h2>
        <p className="text-xs text-muted">
          到点推送本地通知；工作日模式按中国法定工作日（含调休）排程。待办以 App
          内列表为准。
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.reminder.enabled}
            onChange={(e) => void handleReminderToggle(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          <span className="text-sm text-secondary">开启提醒</span>
        </label>
        <label className="block space-y-1">
          <span className="label-field">提醒时间</span>
          <input
            type="time"
            value={reminderTimeForInput}
            onChange={(e) => handleReminderTimeChange(e.target.value)}
            disabled={!settings.reminder.enabled}
            className="input-field"
          />
        </label>
        <div className="space-y-2">
          <span className="label-field block">重复</span>
          <div className="theme-segment" role="group" aria-label="提醒重复">
            <button
              type="button"
              disabled={!settings.reminder.enabled}
              onClick={() => handleReminderRepeat('weekdays')}
              className={`theme-segment-btn ${settings.reminder.repeat === 'weekdays' ? 'theme-segment-btn-active' : ''}`}
            >
              工作日
            </button>
            <button
              type="button"
              disabled={!settings.reminder.enabled}
              onClick={() => handleReminderRepeat('daily')}
              className={`theme-segment-btn ${settings.reminder.repeat === 'daily' ? 'theme-segment-btn-active' : ''}`}
            >
              每天
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
          {confirmClear
            ? '再次点击确认清除所有工时与草稿'
            : '清除所有本地数据'}
        </button>
        <p className="text-center text-xs text-muted">不会清除已保存的 API Key</p>
      </section>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="btn-primary w-full"
      >
        返回工作记录
      </button>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast(null)} />
      )}
    </div>
  );
}
