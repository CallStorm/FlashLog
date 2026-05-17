import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Trash2 } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import { clearAllWorkLogs } from '@/db/workLogRepository';
import { useDraftStore } from '@/stores/draftStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import { Toast } from '@/components/Toast';
import { resetTrackingStartDate } from '@/services/pendingWorklogService';
import {
  requestReminderPermission,
  syncReminderSchedule,
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
        setToast('璇峰湪绯荤粺璁剧疆涓厑璁搁€氱煡鏉冮檺');
        return;
      }
    }
    await updateSettings({
      reminder: { ...settings.reminder, enabled },
    });
    setToast(enabled ? '宸插紑鍚畾鏃舵彁閱? : '宸插叧闂畾鏃舵彁閱?);
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
        鍔犺浇涓€?      </div>
    );
  }

  const handleSaveLlmKey = async () => {
    await setLlmApiKeyValue(llmKeyInput.trim());
    setLlmKeyInput('');
    setToast('LLM API Key 宸蹭繚瀛?);
  };

  const handleSaveAsrKey = async () => {
    await setAsrApiKeyValue(asrKeyInput.trim());
    setAsrKeyInput('');
    setToast('ASR API Key 宸蹭繚瀛?);
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
    setToast('鏈湴宸ユ椂涓庤崏绋垮凡娓呴櫎');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="page-title">璁剧疆</h1>
        <p className="mt-1 text-sm text-muted">
          API 璋冪敤璐圭敤鐢辨偍鑷鎵挎媴锛屽瘑閽ヤ粎瀛樹簬鏈満瀹夊叏瀛樺偍銆?        </p>
      </header>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">澶栬</h2>
        <p className="text-xs text-muted">閫夋嫨鐣岄潰閰嶈壊锛屽皢璁颁綇鎮ㄧ殑閫夋嫨</p>
        <div className="theme-segment" role="group" aria-label="涓婚">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`theme-segment-btn ${theme === 'light' ? 'theme-segment-btn-active' : ''}`}
          >
            娴呰壊
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`theme-segment-btn ${theme === 'dark' ? 'theme-segment-btn-active' : ''}`}
          >
            娣辫壊
          </button>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">LLM 路 鐏北鏂硅垷</h2>
          <button
            type="button"
            onClick={() => void restoreLlmDefaults()}
            className="flex items-center gap-1 text-xs text-secondary hover:text-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            鎭㈠鐏北榛樿
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
          <span className="label-field">API Key锛堣劚鏁忓瓨鍌級</span>
          <input
            type="password"
            value={llmKeyInput}
            onChange={(e) => setLlmKeyInput(e.target.value)}
            placeholder={llmKeyConfigured ? '杈撳叆鏂?Key 瑕嗙洊' : '杈撳叆 API Key'}
            className="input-field w-full"
            autoComplete="off"
          />
          {llmKeyConfigured && (
            <p className="text-xs text-muted">宸蹭繚瀛?Key锛岃緭鍏ユ柊鍊煎彲瑕嗙洊</p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveLlmKey()}
            disabled={!llmKeyInput.trim()}
            className="btn-secondary mt-2 w-full"
          >
            淇濆瓨
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">Model / Endpoint ID锛堝繀濉級</span>
          <input
            value={settings.llm.model}
            onChange={(e) => void updateLlm({ model: e.target.value })}
            placeholder="ep-xxxxxxxx 鎴?doubao-1-5-pro-32k-250115"
            className="input-field"
          />
        </label>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">ASR 路 鐏北璞嗗寘璇煶</h2>
        <p className="text-xs text-muted">
          鏂扮増鎺у埗鍙伴壌鏉冿紝瑙亄' '}
          <a
            href="https://www.volcengine.com/docs/6561/1354869?lang=zh"
            target="_blank"
            rel="noreferrer"
            className="link-accent"
          >
            澶фā鍨嬫祦寮忚闊宠瘑鍒?          </a>
        </p>

        <div className="block space-y-1">
          <span className="label-field">API Key锛圶-Api-Key锛?/span>
          <input
            type="password"
            value={asrKeyInput}
            onChange={(e) => setAsrKeyInput(e.target.value)}
            placeholder={asrConfigured ? '杈撳叆鏂?Key 瑕嗙洊' : '杈撳叆 API Key'}
            className="input-field w-full"
            autoComplete="off"
          />
          {asrConfigured && (
            <p className="text-xs text-muted">宸蹭繚瀛?Key锛岃緭鍏ユ柊鍊煎彲瑕嗙洊</p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveAsrKey()}
            disabled={!asrKeyInput.trim()}
            className="btn-secondary mt-2 w-full"
          >
            淇濆瓨
          </button>
        </div>

        <label className="block space-y-1">
          <span className="label-field">Resource ID锛圶-Api-Resource-Id锛?/span>
          <input
            value={settings.asr.resourceId}
            onChange={(e) => void updateAsr({ resourceId: e.target.value })}
            placeholder={DEFAULT_SETTINGS.asr.resourceId}
            className="input-field"
          />
        </label>
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="section-title">瀹氭椂鎻愰啋</h2>
        <p className="text-xs text-muted">
          鍒扮偣鐢辩郴缁熸帹閫佹湰鍦伴€氱煡锛屾棤闇€淇濇寔 App 鎵撳紑锛涜鍏佽閫氱煡鏉冮檺锛岄儴鍒嗘満鍨嬭繕闇€鍏佽銆岄椆閽熶笌鎻愰啋銆嶅苟鍏抽棴鐪佺數闄愬埗銆?        </p>
        <p className="text-xs text-muted">
          銆屾秷鎭€峊ab 涓殑寰呭姙涓烘湭濉伐鏃剁殑娉曞畾宸ヤ綔鏃ュ垪琛紝涓庨€氱煡鐙珛锛涙竻绌烘湰鍦版暟鎹悗寰呭姙浠庝粖鏃ラ噸鏂扮粺璁★紙鑻ヤ粖鏃ラ潪宸ヤ綔鏃ワ紝鍒楄〃鍙兘涓虹┖锛夈€?        </p>
        <p className="text-xs text-muted">
          銆屽伐浣滄棩銆嶆寜涓浗娉曞畾宸ヤ綔鏃ユ帓绋嬶紙鍛ㄦ湯/鑺傚亣鏃ヤ笉鎺ㄩ€侊級锛涖€屾瘡澶┿€嶅惈鍛ㄦ湯銆傛墦寮€ App 鏃朵細鑷姩琛ユ帓鏈潵鎻愰啋銆?        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.reminder.enabled}
            onChange={(e) => void handleReminderToggle(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          <span className="text-sm text-secondary">寮€鍚彁閱?/span>
        </label>
        <label className="block space-y-1">
          <span className="label-field">鎻愰啋鏃堕棿</span>
          <input
            type="time"
            value={reminderTimeForInput}
            onChange={(e) => handleReminderTimeChange(e.target.value)}
            disabled={!settings.reminder.enabled}
            className="input-field"
          />
        </label>
        <div className="space-y-2">
          <span className="label-field block">閲嶅</span>
          <div className="theme-segment" role="group" aria-label="鎻愰啋閲嶅">
            <button
              type="button"
              disabled={!settings.reminder.enabled}
              onClick={() => handleReminderRepeat('weekdays')}
              className={`theme-segment-btn ${settings.reminder.repeat === 'weekdays' ? 'theme-segment-btn-active' : ''}`}
            >
              宸ヤ綔鏃?            </button>
            <button
              type="button"
              disabled={!settings.reminder.enabled}
              onClick={() => handleReminderRepeat('daily')}
              className={`theme-segment-btn ${settings.reminder.repeat === 'daily' ? 'theme-segment-btn-active' : ''}`}
            >
              姣忓ぉ
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
            ? '鍐嶆鐐瑰嚮纭娓呴櫎鎵€鏈夊伐鏃朵笌鑽夌'
            : '娓呴櫎鎵€鏈夋湰鍦版暟鎹?}
        </button>
        <p className="text-center text-xs text-muted">
          涓嶄細娓呴櫎宸蹭繚瀛樼殑 API Key锛涙竻绌哄悗寰呭姙缁熻璧风偣閲嶇疆涓轰粖澶?        </p>
      </section>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="btn-primary w-full"
      >
        杩斿洖宸ヤ綔璁板綍
      </button>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast(null)} />
      )}
    </div>
  );
}
