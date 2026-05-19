import { DEFAULT_INTENT_SYSTEM_PROMPT } from '@/constants/analysisDefaults';
import type { ExportRange } from '@/services/export/types';
import {
  normalizeIntentResult,
  resolveIntentRules,
} from '@/services/analysis/analysisIntentRules';
import { chatCompletion } from '@/services/analysis/llmChat';
import type { IntentResult, PickerPreset } from '@/types/analysis';
import { formatRangeLabel } from '@/utils/date';
import { AiServiceError } from '@/services/aiService';

export interface ClassifyIntentOptions {
  baseUrl: string;
  model: string;
  userQuestion: string;
  currentPicker: PickerPreset;
  activeRange: ExportRange;
  recentTurns?: string;
  signal?: AbortSignal;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('invalid json');
  }
}

export async function classifyAnalysisIntent(
  options: ClassifyIntentOptions,
): Promise<IntentResult> {
  const rangeLabel = formatRangeLabel(options.activeRange.start, options.activeRange.end);
  const pickerDesc =
    options.currentPicker === 'custom'
      ? `自定义 ${rangeLabel}`
      : `${options.currentPicker}（${rangeLabel}）`;

  const userPayload = [
    `当前日期：${new Date().toISOString().slice(0, 10)}`,
    `顶部已选时间范围：${pickerDesc}`,
    `说明：「本周/上周」指周一至周日的完整自然周。`,
    options.recentTurns ? `最近对话摘要：\n${options.recentTurns}` : '',
    `用户问题：${options.userQuestion}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const raw = await chatCompletion({
      baseUrl: options.baseUrl,
      model: options.model,
      messages: [
        { role: 'system', content: DEFAULT_INTENT_SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      stream: false,
      maxTokens: 256,
      temperature: 0,
      signal: options.signal,
    });
    const parsed = normalizeIntentResult(extractJson(raw));
    if (parsed) return parsed;
  } catch (err) {
    if (err instanceof AiServiceError && err.code === 'NO_KEY') throw err;
  }

  return resolveIntentRules(options.userQuestion);
}
