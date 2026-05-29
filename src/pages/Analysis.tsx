import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, Volume2, VolumeX } from 'lucide-react';
import { AnalysisChat } from '@/components/analysis/AnalysisChat';
import { AnalysisInputBar } from '@/components/analysis/AnalysisInputBar';
import { AnalysisWelcome } from '@/components/analysis/AnalysisWelcome';
import { Toast } from '@/components/Toast';
import { TIME_MISSING_REPLY } from '@/constants/analysisDefaults';
import { initWorkLogDb, listWorkLogs } from '@/db/workLogRepository';
import { streamAnalysisChat } from '@/services/analysis/analysisChatService';
import { parseTimeRangeFromQuestion } from '@/services/analysis/parseTimeRange';
import { buildWorklogPlainText } from '@/services/export/formatters';
import { useAnalysisChatStore, newMessageId } from '@/stores/analysisChatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AiServiceError } from '@/services/aiService';
import { filterLogsByDateRange, formatRangeLabel } from '@/utils/date';

export function Analysis() {
  const navigate = useNavigate();
  const { settings, llmKeyConfigured, asrConfigured, loaded, load } =
    useSettingsStore();
  const {
    messages,
    lastResolvedRange,
    voiceBroadcastEnabled,
    phase,
    loaded: chatLoaded,
    load: loadChat,
    setLastResolvedRange,
    toggleVoiceBroadcast,
    addMessage,
    updateMessage,
    setPhase,
    clearChat,
  } = useAnalysisChatStore();

  const [toast, setToast] = useState<{
    message: string;
    variant?: 'info' | 'error' | 'success';
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void load();
    void loadChat();
    void initWorkLogDb();
  }, [load, loadChat]);

  const busy = phase !== 'idle';

  const handleUserMessage = useCallback(
    async (userText: string) => {
      if (!llmKeyConfigured || !settings.llm.model.trim()) return;

      const text = userText.trim();
      if (!text) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      addMessage({ id: newMessageId(), role: 'user', content: text });

      const assistantId = newMessageId();
      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'thinking',
      });
      setPhase('thinking');

      try {
        const { range } = await parseTimeRangeFromQuestion({
          text,
          baseUrl: settings.llm.baseUrl,
          model: settings.llm.model,
          lastResolvedRange,
          signal: ac.signal,
        });

        if (!range) {
          updateMessage(assistantId, {
            content: TIME_MISSING_REPLY,
            status: 'done',
          });
          setPhase('idle');
          return;
        }

        setLastResolvedRange(range);
        const rangeLabel = `分析范围：${formatRangeLabel(range.start, range.end)}`;
        updateMessage(assistantId, { rangeLabel });

        const allLogs = await listWorkLogs(365);
        const filtered = filterLogsByDateRange(allLogs, range.start, range.end);
        const workContext = buildWorklogPlainText(filtered, range);

        const history = messages
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.content }));

        setPhase('streaming');
        updateMessage(assistantId, { status: 'streaming' });

        let streamBuf = '';
        await streamAnalysisChat({
          baseUrl: settings.llm.baseUrl,
          model: settings.llm.model,
          workContext,
          range,
          userQuestion: text,
          conversationHistory: history,
          signal: ac.signal,
          onToken: (_t, acc) => {
            streamBuf = acc;
            updateMessage(assistantId, { content: acc });
          },
        });

        updateMessage(assistantId, {
          content: streamBuf,
          status: 'done',
        });
        setPhase('idle');
      } catch (err) {
        if (ac.signal.aborted) {
          setPhase('idle');
          return;
        }
        const msg =
          err instanceof AiServiceError ? err.message : '分析失败，请重试';
        updateMessage(assistantId, { status: 'error', error: msg });
        setPhase('idle');
        setToast({ message: msg, variant: 'error' });
      }
    },
    [
      llmKeyConfigured,
      settings.llm,
      lastResolvedRange,
      messages,
      addMessage,
      updateMessage,
      setLastResolvedRange,
    ],
  );

  const handleBroadcastToggle = () => {
    toggleVoiceBroadcast();
    setToast({ message: '语音播报功能即将推出', variant: 'info' });
  };

  if (!loaded || !chatLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (!llmKeyConfigured || !settings.llm.model.trim()) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">工时分析</h1>
        <p className="max-w-sm text-[var(--color-text-secondary)]">
          请先在设置中配置 LLM API Key 与模型（Endpoint ID），再使用分析功能。
        </p>
        <button type="button" className="btn-primary" onClick={() => navigate('/settings')}>
          去设置
        </button>
      </div>
    );
  }

  return (
    <div className="analysis-page mx-auto flex min-h-0 max-w-lg flex-1 flex-col px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="analysis-header">
        <h1 className="page-title">分析助手</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`btn-ghost rounded-full p-2 ${voiceBroadcastEnabled ? 'text-[var(--color-accent)]' : ''}`}
            aria-label="语音播报"
            onClick={handleBroadcastToggle}
          >
            {voiceBroadcastEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="btn-ghost rounded-full p-2"
              aria-label="清空对话"
              onClick={() => void clearChat()}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <div className="analysis-chat-wrap flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <AnalysisWelcome disabled={busy} onSelectQuestion={(q) => void handleUserMessage(q)} />
        ) : (
          <AnalysisChat messages={messages} />
        )}
      </div>

      <footer className="analysis-footer">
        <AnalysisInputBar
          disabled={busy}
          asrConfigured={asrConfigured}
          asrSettings={settings.asr}
          onSend={(text) => void handleUserMessage(text)}
          onToast={(message, variant) => setToast({ message, variant })}
        />
      </footer>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
