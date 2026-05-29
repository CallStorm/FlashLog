import { buildAnalysisChatSystemPrompt } from '@/constants/analysisChatPrompts';
import { chatCompletion } from '@/services/analysis/llmChat';
import type { ExportRange } from '@/services/export/types';

export interface StreamAnalysisChatOptions {
  baseUrl: string;
  model: string;
  workContext: string;
  range: ExportRange;
  userQuestion: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  onToken: (token: string, accumulated: string) => void;
  signal?: AbortSignal;
}

export async function streamAnalysisChat(
  options: StreamAnalysisChatOptions,
): Promise<string> {
  const system = buildAnalysisChatSystemPrompt(options.workContext, options.range);

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
