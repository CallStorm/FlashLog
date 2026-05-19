import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { AnalysisChat } from '@/components/analysis/AnalysisChat';
import { buildAssistantBlocksFromSnapshot } from '@/components/analysis/AnalysisMessage';
import { AnalysisQuickChips } from '@/components/analysis/AnalysisQuickChips';
import { AnalysisRangePicker } from '@/components/analysis/AnalysisRangePicker';
import { Toast } from '@/components/Toast';
import { defaultNarrativeVariant, scenarioById } from '@/constants/analysisScenarios';
import { initWorkLogDb, listWorkLogs } from '@/db/workLogRepository';
import { resolveActiveRange } from '@/services/analysis/analysisRange';
import type { ExportRange } from '@/services/export/types';
import { classifyAnalysisIntent } from '@/services/analysis/analysisIntentService';
import { streamAnalysisAnswer } from '@/services/analysis/analysisChatService';
import {
  buildAnalysisSnapshot,
  isWeekAlignedRange,
} from '@/services/analysis/analysisStatsService';
import { parseAnalysisAnswer } from '@/services/analysis/parseAnalysisAnswer';
import { useAnalysisChatStore, newMessageId } from '@/stores/analysisChatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type {
  AnalysisScenarioId,
  AnalysisVariant,
  HoursAnalysisVariant,
  IntentResult,
  NarrativeVariant,
  PickerPreset,
} from '@/types/analysis';
import { filterLogsByDateRange, formatRangeLabel } from '@/utils/date';
import { AiServiceError } from '@/services/aiService';

const DEFAULT_HOURS_VARIANT: HoursAnalysisVariant = 'daily_overview';

export function Analysis() {
  const navigate = useNavigate();
  const { settings, llmKeyConfigured, loaded, load } = useSettingsStore();
  const {
    messages,
    picker,
    customRange,
    phase,
    loaded: chatLoaded,
    load: loadChat,
    getActiveRange,
    changeRangeFromUI,
    setPickerQuiet,
    addMessage,
    updateMessage,
    setPhase,
    clearChat,
  } = useAnalysisChatStore();

  const [input, setInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [clarification, setClarification] = useState<IntentResult['clarification']>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void load();
    void loadChat();
    void initWorkLogDb();
  }, [load, loadChat]);

  const busy = phase !== 'idle';

  const handleRangeChange = useCallback(
    (preset: PickerPreset, custom?: ExportRange) => {
      abortRef.current?.abort();
      setClarification(null);
      changeRangeFromUI(preset, custom);
    },
    [changeRangeFromUI],
  );

  const applyPickerAdjust = useCallback(
    (adjust: PickerPreset | null | undefined, current: PickerPreset) => {
      if (adjust && adjust !== current && adjust !== 'custom') {
        setPickerQuiet(adjust);
        return adjust;
      }
      return current;
    },
    [setPickerQuiet],
  );

  const resolveVariant = (
    scenario: AnalysisScenarioId,
    variant: AnalysisVariant | undefined,
    effectivePicker: PickerPreset,
  ): AnalysisVariant => {
    if (scenario === 'narrative_summary') {
      if (variant && ['weekly', 'monthly', 'performance', 'custom'].includes(variant)) {
        return variant as NarrativeVariant;
      }
      return defaultNarrativeVariant(
        effectivePicker,
        resolveActiveRange(effectivePicker, customRange),
      );
    }
    if (variant && ['daily_overview', 'task_breakdown', 'health_check'].includes(variant)) {
      return variant as HoursAnalysisVariant;
    }
    return DEFAULT_HOURS_VARIANT;
  };

  const runAnalysis = useCallback(
    async (params: {
      userText: string;
      scenario?: AnalysisScenarioId;
      variant?: AnalysisVariant;
      skipIntent?: boolean;
    }) => {
      if (!llmKeyConfigured || !settings.llm.model.trim()) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const userMsgId = newMessageId();
      addMessage({ id: userMsgId, role: 'user', content: params.userText });

      const assistantId = newMessageId();
      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        status: params.skipIntent ? 'building' : 'classifying',
        blocks: [],
      });

      setClarification(null);
      setPhase(params.skipIntent ? 'building' : 'classifying');

      let effectivePicker = picker;
      let scenario: AnalysisScenarioId = params.scenario ?? 'hours_analysis';
      let variant: AnalysisVariant = params.variant ?? DEFAULT_HOURS_VARIANT;
      let label = scenarioById(scenario).chipLabel;

      try {
        if (!params.skipIntent) {
          const recent = messages
            .slice(-4)
            .map((m) => `${m.role}: ${m.content.slice(0, 120)}`)
            .join('\n');
          const intent = await classifyAnalysisIntent({
            baseUrl: settings.llm.baseUrl,
            model: settings.llm.model,
            userQuestion: params.userText,
            currentPicker: effectivePicker,
            activeRange: resolveActiveRange(effectivePicker, customRange),
            recentTurns: recent || undefined,
            signal: ac.signal,
          });

          if (
            intent.clarification &&
            intent.confidence < 0.6 &&
            !params.scenario
          ) {
            setClarification(intent.clarification);
            updateMessage(assistantId, {
              status: 'done',
              blocks: [
                {
                  type: 'label',
                  text: '需要确认',
                  subtext: intent.clarification.question,
                },
              ],
            });
            setPhase('idle');
            return;
          }

          scenario = params.scenario ?? intent.scenario;
          effectivePicker = applyPickerAdjust(intent.pickerAdjust, effectivePicker);
          variant = resolveVariant(
            scenario,
            params.variant ?? intent.variant,
            effectivePicker,
          );
          label = intent.label;
        } else if (params.scenario) {
          scenario = params.scenario;
          variant = resolveVariant(scenario, params.variant, effectivePicker);
          label = scenarioById(scenario).chipLabel;
        }

        const range = resolveActiveRange(effectivePicker, customRange);
        const subtext = `范围：${formatRangeLabel(range.start, range.end)}`;

        updateMessage(assistantId, { status: 'building' });
        setPhase('building');

        const allLogs = await listWorkLogs(365);
        const filtered = filterLogsByDateRange(
          allLogs,
          range.start,
          range.end,
        );

        const weekAligned = isWeekAlignedRange(range);
        const snapshot = await buildAnalysisSnapshot(
          filtered,
          range,
          scenario,
          variant,
          weekAligned,
        );

        const blocks = buildAssistantBlocksFromSnapshot(snapshot, label, subtext);
        updateMessage(assistantId, { status: 'streaming', blocks });
        setPhase('streaming');

        const history = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let streamBuf = '';
        const raw = await streamAnalysisAnswer({
          baseUrl: settings.llm.baseUrl,
          model: settings.llm.model,
          snapshot,
          userQuestion: params.userText,
          conversationHistory: history,
          signal: ac.signal,
          onToken: (_t, acc) => {
            streamBuf = acc;
            const parsed = parseAnalysisAnswer(acc);
            updateMessage(assistantId, {
              blocks: [
                ...blocks.filter((b) => b.type !== 'summary' && b.type !== 'suggestions'),
                { type: 'summary', content: parsed.summary, streaming: true },
                { type: 'suggestions', items: parsed.suggestions, streaming: true },
              ],
            });
          },
        });

        const final = parseAnalysisAnswer(raw || streamBuf);
        updateMessage(assistantId, {
          status: 'done',
          blocks: [
            ...blocks.filter((b) => b.type !== 'summary' && b.type !== 'suggestions'),
            { type: 'summary', content: final.summary, streaming: false },
            { type: 'suggestions', items: final.suggestions, streaming: false },
          ],
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
        setToast(msg);
      }
    },
    [
      llmKeyConfigured,
      settings.llm,
      picker,
      customRange,
      messages,
      addMessage,
      updateMessage,
      applyPickerAdjust,
    ],
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void runAnalysis({ userText: text });
  };

  const handleChip = (scenario: AnalysisScenarioId) => {
    const def = scenarioById(scenario);
    const variant =
      scenario === 'narrative_summary'
        ? defaultNarrativeVariant(picker, getActiveRange())
        : DEFAULT_HOURS_VARIANT;
    void runAnalysis({
      userText: def.defaultUserMessage,
      scenario,
      variant,
      skipIntent: true,
    });
  };

  const handleClarify = (scenario: AnalysisScenarioId) => {
    setClarification(null);
    const def = scenarioById(scenario);
    void runAnalysis({
      userText: def.defaultUserMessage,
      scenario,
      skipIntent: true,
    });
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
        <h1 className="page-title">分析</h1>
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
      </header>

      <AnalysisRangePicker
        preset={picker}
        customRange={customRange}
        onRangeChange={handleRangeChange}
      />

      <div className="analysis-chat-wrap flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="analysis-empty">
            <h2 className="text-lg font-semibold">用一句话问工时</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              基于本机记录分析；数据经你配置的 LLM 解读
            </p>
            <div className="analysis-example-cards mt-6">
              <button
                type="button"
                className="analysis-example-card"
                disabled={busy}
                onClick={() => handleChip('hours_analysis')}
              >
                分析一下我这段时间的工时情况
              </button>
              <button
                type="button"
                className="analysis-example-card"
                disabled={busy}
                onClick={() => handleChip('narrative_summary')}
              >
                根据记录写一份周报给 leader
              </button>
            </div>
          </div>
        ) : (
          <AnalysisChat messages={messages} />
        )}

        {clarification && (
          <div className="analysis-clarify">
            <p className="text-sm">{clarification.question}</p>
            <div className="analysis-chips mt-2">
              {clarification.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="analysis-chip"
                  onClick={() => handleClarify(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="analysis-footer">
        <AnalysisQuickChips disabled={busy} onSelect={handleChip} />
        <div className="analysis-input-row">
          <textarea
            className="analysis-input"
            rows={2}
            placeholder="例如：分析一下这段时间工时…"
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className="btn-primary analysis-send"
            disabled={busy || !input.trim()}
            onClick={handleSend}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
