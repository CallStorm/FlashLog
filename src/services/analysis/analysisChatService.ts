import { buildAnalysisAnswerSystemPrompt } from '@/constants/analysisAnswerPrompts';
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

export async function streamAnalysisAnswer(
  options: StreamAnalysisAnswerOptions,
): Promise<string> {
  const system = buildAnalysisAnswerSystemPrompt(options.snapshot);

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
