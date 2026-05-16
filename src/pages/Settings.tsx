import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Trash2 } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import { clearAllWorkLogs } from '@/db/workLogRepository';
import { maskSecret } from '@/services/secureConfig';
import { useDraftStore } from '@/stores/draftStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Toast } from '@/components/Toast';

export function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    loaded,
    load,
    updateLlm,
    updateAsr,
    updateSettings,
    setLlmApiKeyValue,
    setAsrApiKeyValue,
    restoreLlmDefaults,
    restoreSystemPrompt,
  } = useSettingsStore();
  const resetDraft = useDraftStore((s) => s.resetAll);

  const [llmKeyInput, setLlmKeyInput] = useState('');
  const [asrKeyInput, setAsrKeyInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-500">
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
    setConfirmClear(false);
    setToast('本地工时与草稿已清除');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-semibold text-stone-50">设置</h1>
        <p className="mt-1 text-sm text-stone-500">
          API 调用费用由您自行承担，密钥仅存于本机安全存储。
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-amber-400">LLM · 火山方舟</h2>
          <button
            type="button"
            onClick={() => void restoreLlmDefaults()}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复火山默认
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-stone-400">API Base URL</span>
          <input
            value={settings.llm.baseUrl}
            onChange={(e) => void updateLlm({ baseUrl: e.target.value })}
            className="input-field"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-stone-400">API Key（脱敏存储）</span>
          <div className="flex gap-2">
            <input
              type="password"
              value={llmKeyInput}
              onChange={(e) => setLlmKeyInput(e.target.value)}
              placeholder={maskSecret('configured') || '输入新 Key'}
              className="input-field flex-1"
              autoComplete="off"
            />
            <button type="button" onClick={() => void handleSaveLlmKey()} className="btn-secondary">
              保存
            </button>
          </div>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-stone-400">Model / Endpoint ID（必填）</span>
          <input
            value={settings.llm.model}
            onChange={(e) => void updateLlm({ model: e.target.value })}
            placeholder="ep-xxxxxxxx 或 doubao-1-5-pro-32k-250115"
            className="input-field"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400">System Prompt</span>
            <button
              type="button"
              onClick={() => void restoreSystemPrompt()}
              className="text-xs text-stone-500 hover:text-amber-400"
            >
              恢复默认
            </button>
          </div>
          <textarea
            value={settings.llm.systemPrompt}
            onChange={(e) => void updateLlm({ systemPrompt: e.target.value })}
            rows={8}
            className="input-field font-mono text-xs leading-relaxed"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
        <h2 className="font-medium text-amber-400">ASR · 火山豆包语音</h2>
        <p className="text-xs text-stone-500">
          新版控制台鉴权，见{' '}
          <a
            href="https://www.volcengine.com/docs/6561/1354869?lang=zh"
            target="_blank"
            rel="noreferrer"
            className="text-amber-500/80 underline"
          >
            大模型流式语音识别
          </a>
        </p>

        <label className="block space-y-1">
          <span className="text-xs text-stone-400">API Key（X-Api-Key）</span>
          <div className="flex gap-2">
            <input
              type="password"
              value={asrKeyInput}
              onChange={(e) => setAsrKeyInput(e.target.value)}
              className="input-field flex-1"
              autoComplete="off"
            />
            <button type="button" onClick={() => void handleSaveAsrKey()} className="btn-secondary">
              保存
            </button>
          </div>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-stone-400">Resource ID（X-Api-Resource-Id）</span>
          <input
            value={settings.asr.resourceId}
            onChange={(e) => void updateAsr({ resourceId: e.target.value })}
            placeholder={DEFAULT_SETTINGS.asr.resourceId}
            className="input-field"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/50 p-4 opacity-60">
        <h2 className="font-medium text-stone-400">定时提醒（V1.1 预留）</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.reminder.enabled}
            onChange={(e) =>
              void updateSettings({
                reminder: { ...settings.reminder, enabled: e.target.checked },
              })
            }
            disabled
            className="h-4 w-4 rounded border-stone-600"
          />
          <span className="text-sm text-stone-500">每天 {settings.reminder.time} 提醒</span>
        </label>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => void handleClearData()}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            confirmClear
              ? 'border-red-500 bg-red-950/50 text-red-200'
              : 'border-stone-700 text-stone-400'
          }`}
        >
          <Trash2 className="h-4 w-4" />
          {confirmClear ? '再次点击确认清除所有工时与草稿' : '清除所有本地数据'}
        </button>
        <p className="text-center text-xs text-stone-600">不会清除已保存的 API Key</p>
      </section>

      <button type="button" onClick={() => navigate('/')} className="btn-primary w-full">
        返回工作记录
      </button>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast(null)} />
      )}
    </div>
  );
}
