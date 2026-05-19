import { DEFAULT_ANALYSIS_SYSTEM_PROMPT } from '@/constants/analysisDefaults';
import { chatCompletion } from '@/services/analysis/llmChat';
import type { AnalysisSnapshot } from '@/types/analysis';

export interface StreamAnalysisAnswerOptions {
  baseUrl: string;
  model: string;
  snapshot: AnalysisSnapshot;
  userQuestion: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  onToken: (token: string, accumulated: string) => void;
  signal?: AbortSignal;
}

function narrativeHint(snapshot: AnalysisSnapshot): string {
  const v = snapshot.variant;
  if (snapshot.scenario !== 'narrative_summary') return '';
  switch (v) {
    case 'monthly':
      return '请撰写月报风格正文，可分「本月工作」「数据摘要」等小节。';
    case 'performance':
      return '请撰写绩效考核向话术，突出成果与量化贡献。';
    case 'custom':
      return '按用户在问题中要求的格式撰写。';
    default:
      return '请撰写周报风格正文，适合发给 leader。';
  }
}

export async function streamAnalysisAnswer(
  options: StreamAnalysisAnswerOptions,
): Promise<string> {
  const hint = narrativeHint(options.snapshot);
  const system = [
    DEFAULT_ANALYSIS_SYSTEM_PROMPT,
    `当前场景：${options.snapshot.scenario}，子类型：${options.snapshot.variant}`,
    hint,
    `统计区间：${options.snapshot.range.start} ~ ${options.snapshot.range.end}`,
    `统计数据：\n${options.snapshot.plainTextContext}`,
  ].join('\n\n');

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
  ];

  for (const turn of options.conversationHistory ?? []) {
    messages.push(turn);
  }
  messages.push({ role: 'user', content: options.userQuestion });

  return chatCompletion({
    baseUrl: options.baseUrl,
    model: options.model,
    messages,
    stream: true,
    onToken: options.onToken,
    signal: options.signal,
  });
}
