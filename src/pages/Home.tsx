import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mic, Sparkles, Save } from 'lucide-react';
import { WorkLogCardForm } from '@/components/WorkLogCardForm';
import { Toast } from '@/components/Toast';
import { insertWorkLog } from '@/db/workLogRepository';
import { AiServiceError, streamChatCompletion } from '@/services/aiService';
import {
  AsrServiceError,
  MAX_RECORD_MS,
  RecordingSession,
  transcribeAudio,
} from '@/services/asrService';
import { useDraftStore } from '@/stores/draftStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getTodayLocal } from '@/utils/date';
import { parseWorkLogCard } from '@/utils/jsonCard';
export function Home() {
  const navigate = useNavigate();
  const { settings, llmKeyConfigured, asrConfigured, loaded, load } =
    useSettingsStore();
  const {
    status,
    draftText,
    streamText,
    card,
    supplementText,
    supplementHistory,
    setStatus,
    setDraftText,
    appendDraftText,
    setStreamText,
    setCard,
    setSupplementText,
    addSupplement,
    setReferenceDate,
    resetAfterSave,
    persistDraft,
    loadDraft,
  } = useDraftStore();

  const [toast, setToast] = useState<{
    message: string;
    variant?: 'info' | 'error' | 'success';
  } | null>(null);
  const [parseError, setParseError] = useState(false);
  const recordingRef = useRef<RecordingSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const today = getTodayLocal();
  const refDate = today;

  useEffect(() => {
    void (async () => {
      await load();
      await loadDraft();
      setReferenceDate(getTodayLocal());
    })();
  }, [load, loadDraft, setReferenceDate]);

  useEffect(() => {
    const t = setTimeout(() => void persistDraft(), 500);
    return () => clearTimeout(t);
  }, [draftText, card, supplementText, persistDraft]);

  const userContent = useCallback(() => {
    const parts = [draftText.trim()];
    if (supplementText.trim()) parts.push(supplementText.trim());
    return parts.filter(Boolean).join('\n\n');
  }, [draftText, supplementText]);

  const canAiSummarize =
    llmKeyConfigured &&
    settings.llm.model.trim() &&
    userContent().length > 0 &&
    !['recording', 'transcribing', 'streaming'].includes(status);

  const showCard = status === 'cardReview' || (status === 'streaming' && card);
  const showSave = status === 'cardReview' && card;

  const handleMicDown = async () => {
    if (!asrConfigured) {
      setToast({ message: '请先在设置中配置 ASR', variant: 'error' });
      return;
    }
    if (['recording', 'transcribing', 'streaming'].includes(status)) return;

    try {
      const session = new RecordingSession();
      recordingRef.current = session;
      await session.start();
      setStatus('recording');
    } catch (err) {
      setToast({
        message: err instanceof AsrServiceError ? err.message : '无法开始录音',
        variant: 'error',
      });
    }
  };

  const handleMicUp = async () => {
    const session = recordingRef.current;
    if (!session || status !== 'recording') return;

    setStatus('transcribing');
    try {
      const blob = await session.stop();
      recordingRef.current = null;
      const text = await transcribeAudio(settings.asr, blob);
      if (text) appendDraftText(text);
      setStatus('draftReady');
    } catch (err) {
      recordingRef.current = null;
      setStatus(draftText.trim() ? 'draftReady' : 'idle');
      setToast({
        message: err instanceof AsrServiceError ? err.message : '转写失败',
        variant: 'error',
      });
    }
  };

  const handleAiSummarize = async () => {
    if (!llmKeyConfigured) {
      setToast({ message: '请先在设置中配置 LLM API Key', variant: 'error' });
      navigate('/settings');
      return;
    }
    if (!navigator.onLine) {
      setToast({ message: '无网络连接', variant: 'error' });
      return;
    }

    const content = userContent();
    if (!content) return;

    if (supplementText.trim()) {
      addSupplement(supplementText.trim());
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setParseError(false);
    setStreamText('');
    setCard(null);
    setStatus('streaming');

    try {
      const full = await streamChatCompletion({
        baseUrl: settings.llm.baseUrl,
        model: settings.llm.model,
        systemPrompt: settings.llm.systemPrompt,
        referenceDate: refDate,
        userContent: content,
        signal: controller.signal,
        onToken: (_t, accumulated) => setStreamText(accumulated),
      });

      const parsed = parseWorkLogCard(full, refDate);
      if (parsed.ok) {
        setCard(parsed.card);
        setParseError(false);
      } else {
        setParseError(true);
        setCard({
          date: refDate,
          title: '',
          durationMinutes: 60,
          description: '',
        });
        setToast({ message: parsed.message, variant: 'error' });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus('draftReady');
      setToast({
        message: err instanceof AiServiceError ? err.message : 'AI 总结失败',
        variant: 'error',
      });
    }
  };

  const handleManualCard = () => {
    setCard({
      date: refDate,
      title: '',
      durationMinutes: 60,
      description: draftText.slice(0, 200),
    });
    setStatus('cardReview');
    setParseError(false);
  };

  const handleSave = async () => {
    if (!card?.title.trim()) {
      setToast({ message: '请填写任务名称', variant: 'error' });
      return;
    }

    try {
      await insertWorkLog({
        date: card.date,
        title: card.title.trim(),
        durationMinutes: card.durationMinutes,
        description: card.description.trim(),
        rawInput: userContent() || draftText,
        supplementHistory:
          supplementHistory.length > 0 ? supplementHistory : undefined,
      });
      resetAfterSave();
      setReferenceDate(today);
      setStatus('saved');
      setToast({ message: '已保存', variant: 'success' });
      setTimeout(() => setStatus('idle'), 400);
    } catch {
      setToast({ message: '保存失败', variant: 'error' });
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-500">
        加载中…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-semibold text-stone-50">工作记录</h1>
        <p className="mt-1 text-sm text-stone-500">
          参考日期 <span className="text-amber-400">{refDate}</span>
          <span className="mx-1">·</span>
          默认记录今天，口述可指定其他日期
        </p>
      </header>

      {!llmKeyConfigured && (
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-200"
        >
          未配置 LLM API Key，AI 总结不可用。可手动填写卡片保存，或前往设置配置。
        </button>
      )}

      <textarea
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        disabled={status === 'recording' || status === 'transcribing'}
        placeholder="描述今日工作内容，或按住麦克风口述…"
        rows={6}
        className="input-field resize-none leading-relaxed"
      />

      {status === 'streaming' && (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-4">
          <p className="mb-2 text-xs text-amber-400">AI 总结中…</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
            {streamText || '等待响应…'}
            <span className="animate-pulse">▌</span>
          </p>
        </div>
      )}

      {showCard && card && (
        <>
          <WorkLogCardForm card={card} onChange={(c) => setCard(c)} />
          {parseError && (
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleAiSummarize()} className="btn-secondary flex-1">
                重试
              </button>
              <button type="button" onClick={handleManualCard} className="btn-secondary flex-1">
                手动编辑
              </button>
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-stone-400">补充说明（再次 AI 总结将合并覆盖预览卡片）</span>
            <textarea
              value={supplementText}
              onChange={(e) => setSupplementText(e.target.value)}
              rows={2}
              className="input-field resize-none text-sm"
              placeholder="补充更多细节…"
            />
          </label>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onPointerDown={() => void handleMicDown()}
          onPointerUp={() => void handleMicUp()}
          onPointerLeave={() => {
            if (status === 'recording') void handleMicUp();
          }}
          disabled={status === 'transcribing' || status === 'streaming'}
          className={`btn-icon flex-1 ${
            status === 'recording' ? 'bg-red-500/20 text-red-400' : ''
          }`}
        >
          {status === 'recording' || status === 'transcribing' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          <span className="text-xs">
            {status === 'recording'
              ? `录音中 ${Math.floor((recordingRef.current?.getElapsedMs() ?? 0) / 1000)}s`
              : status === 'transcribing'
                ? '转写中'
                : '按住说话'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => void handleAiSummarize()}
          disabled={!canAiSummarize}
          className="btn-primary flex-[1.2]"
        >
          {status === 'streaming' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          AI 总结
        </button>

        {showSave && (
          <button type="button" onClick={() => void handleSave()} className="btn-primary flex-1">
            <Save className="h-5 w-5" />
            保存
          </button>
        )}
      </div>

      {status === 'recording' &&
        (recordingRef.current?.isNearLimit() ||
          (recordingRef.current?.getElapsedMs() ?? 0) > MAX_RECORD_MS - 30_000) && (
          <p className="text-center text-xs text-amber-500">即将达到 3 分钟录音上限</p>
        )}

      {!llmKeyConfigured && !card && draftText.trim() && (
        <button type="button" onClick={handleManualCard} className="btn-secondary w-full">
          手动创建工时卡片并保存
        </button>
      )}

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
