import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SETTINGS_COPY } from '@/constants/settingsCopy';
import { buildTtsHeaders } from '@/services/ttsAuth';
import { playBlob } from '@/services/ttsPlayer';
import { getAsrApiKey } from '@/services/secureConfig';
import type { TtsSettings } from '@/types/settings';
import { generateUuid } from '@/utils/uuid';

export { stopTts } from '@/services/ttsPlayer';

const TTS_UID_KEY = 'flashlog_tts_uid';
const VOLC_TTS_SSE_ORIGIN =
  'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse';
const VOLC_TTS_SSE_PROXY = '/api/openspeech/api/v3/tts/unidirectional/sse';
const TTS_SUCCESS_CODE = 20000000;
const TTS_SESSION_FAILED_CODE = 153;
const NATIVE_TTS_READ_TIMEOUT_MS = 120_000;
const NATIVE_TTS_CONNECT_TIMEOUT_MS = 30_000;

export class TtsServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'TtsServiceError';
  }
}

interface TtsSsePayload {
  code: number;
  message?: string;
  data?: string | null;
}

interface ParseStreamState {
  audioChunks: Uint8Array[];
  lastServerMessage: string;
}

function shouldUseTtsProxy(): boolean {
  return import.meta.env.DEV && !Capacitor.isNativePlatform();
}

function resolveTtsUrl(): string {
  return shouldUseTtsProxy() ? VOLC_TTS_SSE_PROXY : VOLC_TTS_SSE_ORIGIN;
}

function wrapNetworkError(err: unknown): TtsServiceError {
  if (import.meta.env.DEV && err instanceof Error && err.message) {
    return new TtsServiceError(
      `${SETTINGS_COPY.ttsNetworkError}（${err.message}）`,
      'NETWORK',
    );
  }
  return new TtsServiceError(SETTINGS_COPY.ttsNetworkError, 'NETWORK');
}

async function getDeviceUid(): Promise<string> {
  const { value } = await Preferences.get({ key: TTS_UID_KEY });
  if (value) return value;
  const uid = generateUuid();
  await Preferences.set({ key: TTS_UID_KEY, value: uid });
  return uid;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isSessionFailed(payload: TtsSsePayload): boolean {
  const msg = payload.message ?? '';
  return (
    payload.code === TTS_SESSION_FAILED_CODE ||
    msg.includes('SessionFailed') ||
    msg.includes('session failed')
  );
}

function mapTtsError(payload: TtsSsePayload, httpStatus?: number): TtsServiceError {
  const code = payload.code;
  const message = payload.message ?? '';

  if (httpStatus === 401 || httpStatus === 403) {
    return new TtsServiceError(SETTINGS_COPY.ttsAuthFailed, 'AUTH');
  }
  if (code === 45000000 || message.includes('speaker permission denied')) {
    return new TtsServiceError(SETTINGS_COPY.ttsSpeakerDenied, 'SPEAKER');
  }
  if (code === 40402003 || message.includes('TTSExceededTextLimit')) {
    return new TtsServiceError(SETTINGS_COPY.ttsTextTooLong, 'TEXT_LIMIT');
  }
  if (
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('concurrency')
  ) {
    return new TtsServiceError(SETTINGS_COPY.ttsQuotaExceeded, 'QUOTA');
  }
  if (isSessionFailed(payload)) {
    return new TtsServiceError(
      message || SETTINGS_COPY.ttsFailed,
      'SESSION_FAILED',
    );
  }

  return new TtsServiceError(
    message || SETTINGS_COPY.ttsFailed,
    'NETWORK',
  );
}

function extractJsonFromLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('event:')) return null;

  if (trimmed.startsWith('data:')) {
    const jsonStr = trimmed.slice(5).trim();
    return jsonStr || null;
  }

  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  return null;
}

function processTtsPayload(
  payload: TtsSsePayload,
  state: ParseStreamState,
): void {
  if (payload.message?.trim()) {
    state.lastServerMessage = payload.message.trim();
  }

  if (payload.code === TTS_SUCCESS_CODE) return;

  if (payload.code !== 0) {
    throw mapTtsError(payload);
  }

  if (typeof payload.data === 'string' && payload.data.length > 0) {
    state.audioChunks.push(base64ToUint8Array(payload.data));
  }
}

function processLine(line: string, state: ParseStreamState): void {
  const jsonStr = extractJsonFromLine(line);
  if (!jsonStr) return;

  let payload: TtsSsePayload;
  try {
    payload = JSON.parse(jsonStr) as TtsSsePayload;
  } catch {
    return;
  }

  processTtsPayload(payload, state);
}

function throwIfNoAudio(state: ParseStreamState): void {
  if (state.audioChunks.length > 0) return;

  const detail = state.lastServerMessage
    ? `${SETTINGS_COPY.ttsNoAudio}：${state.lastServerMessage}`
    : SETTINGS_COPY.ttsNoAudio;
  throw new TtsServiceError(detail, 'NO_AUDIO');
}

function parseSseText(fullText: string): Uint8Array[] {
  const state: ParseStreamState = { audioChunks: [], lastServerMessage: '' };
  for (const line of fullText.split(/\r?\n/)) {
    processLine(line, state);
  }
  throwIfNoAudio(state);
  return state.audioChunks;
}

function buildRequestBody(settings: TtsSettings, text: string, uid: string) {
  return {
    user: { uid },
    req_params: {
      text,
      speaker: settings.speaker,
      model: settings.model,
      audio_params: {
        format: settings.format,
        sample_rate: settings.sampleRate,
      },
      additions: JSON.stringify({ disable_markdown_filter: true }),
    },
  };
}

async function parseSseStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): Promise<Uint8Array[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const state: ParseStreamState = { audioChunks: [], lastServerMessage: '' };

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        processLine(line, state);
      }
    }

    if (buffer.trim()) {
      processLine(buffer, state);
    }
  } finally {
    reader.releaseLock();
  }

  throwIfNoAudio(state);
  return state.audioChunks;
}

function logTtsDiagnostics(info: {
  url: string;
  status: number;
  logId?: string | null;
  transport: 'fetch' | 'native';
}): void {
  if (!import.meta.env.DEV && !Capacitor.isNativePlatform()) return;
  console.warn('[TTS]', {
    ...info,
    native: Capacitor.isNativePlatform(),
  });
}

function responseDataToText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data == null) return '';
  return JSON.stringify(data);
}

async function synthesizeSpeechNative(
  settings: TtsSettings,
  trimmed: string,
  uid: string,
  headers: ReturnType<typeof buildTtsHeaders>,
): Promise<Uint8Array[]> {
  const body = buildRequestBody(settings, trimmed, uid);

  let response;
  try {
    response = await CapacitorHttp.request({
      method: 'POST',
      url: VOLC_TTS_SSE_ORIGIN,
      headers: {
        ...headers,
        Accept: 'text/event-stream',
      },
      data: body,
      responseType: 'text',
      readTimeout: NATIVE_TTS_READ_TIMEOUT_MS,
      connectTimeout: NATIVE_TTS_CONNECT_TIMEOUT_MS,
    });
  } catch (err) {
    throw wrapNetworkError(err);
  }

  const logId =
    typeof response.headers === 'object' && response.headers
      ? (response.headers['X-Tt-Logid'] ??
        response.headers['x-tt-logid'] ??
        null)
      : null;

  logTtsDiagnostics({
    url: VOLC_TTS_SSE_ORIGIN,
    status: response.status,
    logId,
    transport: 'native',
  });

  if (response.status < 200 || response.status >= 300) {
    throw mapTtsError(
      {
        code: response.status,
        message: typeof response.data === 'string' ? response.data : '',
      },
      response.status,
    );
  }

  const text = responseDataToText(response.data);
  if (!text.trim()) {
    throw new TtsServiceError(SETTINGS_COPY.ttsNoAudio, 'NO_BODY');
  }

  return parseSseText(text);
}

async function synthesizeSpeechWeb(
  settings: TtsSettings,
  trimmed: string,
  uid: string,
  headers: ReturnType<typeof buildTtsHeaders>,
  signal?: AbortSignal,
): Promise<Uint8Array[]> {
  let response: Response;
  try {
    response = await fetch(resolveTtsUrl(), {
      method: 'POST',
      headers: {
        ...headers,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(buildRequestBody(settings, trimmed, uid)),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw wrapNetworkError(err);
  }

  logTtsDiagnostics({
    url: resolveTtsUrl(),
    status: response.status,
    logId: response.headers.get('X-Tt-Logid'),
    transport: 'fetch',
  });

  if (!response.ok) {
    throw mapTtsError(
      { code: response.status, message: response.statusText },
      response.status,
    );
  }

  if (!response.body) {
    throw new TtsServiceError(SETTINGS_COPY.ttsNoAudio, 'NO_BODY');
  }

  return parseSseStream(response.body, signal);
}

export async function synthesizeSpeech(
  settings: TtsSettings,
  text: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new TtsServiceError('没有可播报的文本', 'TEXT_LIMIT');
  }

  const apiKey = await getAsrApiKey();
  if (!apiKey) {
    throw new TtsServiceError(SETTINGS_COPY.ttsConfigureAsrFirst, 'AUTH');
  }
  if (!settings.resourceId.trim() || !settings.speaker.trim()) {
    throw new TtsServiceError(SETTINGS_COPY.ttsFailed, 'CONFIG');
  }

  const requestId = generateUuid();
  const uid = await getDeviceUid();
  const headers = buildTtsHeaders({
    apiKey,
    resourceId: settings.resourceId.trim(),
    requestId,
  });

  const audioChunks = Capacitor.isNativePlatform()
    ? await synthesizeSpeechNative(settings, trimmed, uid, headers)
    : await synthesizeSpeechWeb(settings, trimmed, uid, headers, signal);

  const mimeType = settings.format === 'mp3' ? 'audio/mpeg' : 'audio/mpeg';
  return new Blob(audioChunks, { type: mimeType });
}

export async function speakText(
  settings: TtsSettings,
  text: string,
  signal?: AbortSignal,
): Promise<void> {
  const blob = await synthesizeSpeech(settings, text, signal);
  await playBlob(blob, signal);
}

export function ttsErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return '';
  }
  if (err instanceof TtsServiceError) {
    return err.message;
  }
  if (err instanceof TypeError) {
    return SETTINGS_COPY.ttsNetworkError;
  }
  return SETTINGS_COPY.ttsFailed;
}
