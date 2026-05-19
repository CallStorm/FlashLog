import { AiServiceError } from '@/services/aiService';
import { getLlmApiKey } from '@/services/secureConfig';

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export async function chatCompletion(
  options: {
    baseUrl: string;
    model: string;
    messages: ChatMessageParam[];
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    onToken?: (token: string, accumulated: string) => void;
    firstTokenTimeoutMs?: number;
  },
): Promise<string> {
  const apiKey = await getLlmApiKey();
  if (!apiKey) throw new AiServiceError('未配置 LLM API Key', 'NO_KEY');
  if (!options.model.trim()) throw new AiServiceError('未配置 Model / Endpoint ID', 'NO_MODEL');

  const url = `${normalizeBaseUrl(options.baseUrl)}/chat/completions`;
  const stream = options.stream ?? false;

  const controller = new AbortController();
  const linked = options.signal;
  if (linked) {
    if (linked.aborted) controller.abort();
    else linked.addEventListener('abort', () => controller.abort());
  }

  const firstTokenMs = options.firstTokenTimeoutMs ?? 15_000;
  let firstTokenTimer: ReturnType<typeof setTimeout> | null = stream
    ? setTimeout(() => controller.abort(), firstTokenMs)
    : null;

  const clearFirstTokenTimer = () => {
    if (firstTokenTimer) {
      clearTimeout(firstTokenTimer);
      firstTokenTimer = null;
    }
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model.trim(),
        stream,
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? (stream ? undefined : 0),
        messages: options.messages,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearFirstTokenTimer();
    if (controller.signal.aborted) {
      throw new AiServiceError('连接超时，请检查网络后重试', 'TIMEOUT');
    }
    throw new AiServiceError(err instanceof Error ? err.message : '网络请求失败', 'NETWORK');
  }

  if (!response.ok) {
    clearFirstTokenTimer();
    const errText = await response.text().catch(() => '');
    throw new AiServiceError(
      `LLM 请求失败 (${response.status})${errText ? `: ${errText.slice(0, 200)}` : ''}`,
      'HTTP',
    );
  }

  if (!stream) {
    clearFirstTokenTimer();
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? '';
    if (!content.trim()) throw new AiServiceError('模型未返回有效内容', 'EMPTY');
    return content;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    clearFirstTokenTimer();
    throw new AiServiceError('无法读取流式响应', 'STREAM');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = parsed.choices?.[0]?.delta?.content ?? '';
          if (token) {
            clearFirstTokenTimer();
            accumulated += token;
            options.onToken?.(token, accumulated);
          }
        } catch {
          /* skip */
        }
      }
    }
  } finally {
    clearFirstTokenTimer();
    reader.releaseLock();
  }

  if (!accumulated.trim()) throw new AiServiceError('模型未返回有效内容', 'EMPTY');
  return accumulated;
}
