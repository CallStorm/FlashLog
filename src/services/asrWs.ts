import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AsrSettings } from '@/types/settings';
import { generateUuid } from '@/utils/uuid';
import {
  buildNewConsoleAsrHeaders,
  volcAsrAuthHeadersToSearchParams,
  type VolcAsrAuthHeaders,
} from '@/services/asrAuth';
import { getAsrApiKey } from '@/services/secureConfig';
import { AsrServiceError } from '@/services/asrErrors';
import {
  VOLC_ASR_NOSTREAM_PATH,
  buildAudioRequestFrame,
  buildFullClientRequestFrame,
  extractVolcTranscript,
  parseVolcServerPacket,
  resolveVolcAudioConfig,
} from '@/services/volcAsrProtocol';
import {
  HeaderWebSocket,
  uint8ArrayToBase64,
  base64ToArrayBuffer,
} from '@/plugins/headerWebSocket';

const WS_TIMEOUT_MS = 60_000;

/** [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh) 流式输入（录完识别） */
export const VOLC_ASR_WSS_ORIGIN = 'wss://openspeech.bytedance.com';

/** 开发态 Web 经 Vite 代理注入握手 Header（浏览器无法自定义 WebSocket Header） */
const VOLC_ASR_WS_PROXY_PREFIX = '/api/openspeech-ws';

function shouldUseAsrWebSocketProxy(): boolean {
  return import.meta.env.DEV && !Capacitor.isNativePlatform();
}

function volcHeadersToRecord(headers: VolcAsrAuthHeaders): Record<string, string> {
  return { ...headers };
}

function formatWsFailureMessage(code?: number, reason?: string): string {
  if (code === 401 || code === 403) {
    return 'ASR 鉴权失败，请检查 API Key 与 Resource ID 是否正确';
  }
  if (code === 1006 || code === -1) {
    return '无法连接语音识别服务，请检查网络或关闭 VPN 后重试';
  }
  if (reason?.trim()) {
    return `WebSocket 连接失败：${reason} (${code ?? 'unknown'})`;
  }
  if (code != null) {
    return `WebSocket 连接失败 (code ${code})`;
  }
  return 'WebSocket 连接失败，请检查 API Key 与 Resource ID';
}

interface AsrRequestPayload {
  user: { uid: string };
  audio: Record<string, unknown>;
  request: Record<string, unknown>;
}

async function buildAsrPayload(
  mimeType: string,
): Promise<AsrRequestPayload> {
  const { format, codec } = resolveVolcAudioConfig(mimeType);
  return {
    user: { uid: 'flashlog-mvp' },
    audio: {
      format,
      codec,
      rate: 16000,
      bits: 16,
      channel: 1,
      language: 'zh-CN',
    },
    request: {
      model_name: 'bigmodel',
      enable_itn: true,
      enable_punc: true,
      show_utterances: true,
      result_type: 'full',
    },
  };
}

async function handleServerPacket(
  data: ArrayBuffer,
  finalText: { value: string },
): Promise<'continue' | 'done' | 'error'> {
  const packet = await parseVolcServerPacket(data);

  if (packet.type === 'error') {
    throw new AsrServiceError(
      `ASR 错误 (${packet.code}): ${packet.message}`,
      'ASR',
    );
  }

  if (packet.type !== 'response') return 'continue';

  const text = extractVolcTranscript(packet.data);
  if (text) finalText.value = text;

  const payload = packet.data as Record<string, unknown> | undefined;
  const utterances = (payload?.result as Record<string, unknown> | undefined)
    ?.utterances;
  const hasDefinite =
    Array.isArray(utterances) &&
    utterances.some((u) => (u as Record<string, unknown>)?.definite === true);

  if (packet.isFinal || hasDefinite) {
    return 'done';
  }
  return 'continue';
}

/**
 * 浏览器开发：Vite WS 代理，Query 参数由代理转为 Header。
 */
export function buildBrowserProxyWebSocketUrl(auth: {
  apiKey: string;
  resourceId: string;
  requestId: string;
}): string {
  const headers = buildNewConsoleAsrHeaders(auth);
  const params = volcAsrAuthHeadersToSearchParams(headers);
  const pathWithQuery = `${VOLC_ASR_NOSTREAM_PATH}?${params.toString()}`;
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${window.location.host}${VOLC_ASR_WS_PROXY_PREFIX}${pathWithQuery}`;
}

/** 原生 App：直连 URL（鉴权仅通过 OkHttp Header） */
export function buildNativeWebSocketUrl(): string {
  return `${VOLC_ASR_WSS_ORIGIN}${VOLC_ASR_NOSTREAM_PATH}`;
}

async function transcribeViaBrowserWebSocket(
  wsUrl: string,
  audioBuffer: ArrayBuffer,
  requestPayload: AsrRequestPayload,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    const finalText = { value: '' };
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      fn();
    };

    const timeoutId = setTimeout(() => {
      ws.close();
      settle(() => reject(new AsrServiceError('语音识别超时', 'TIMEOUT')));
    }, WS_TIMEOUT_MS);

    ws.onopen = async () => {
      try {
        ws.send(
          await buildFullClientRequestFrame(
            requestPayload as unknown as Record<string, unknown>,
          ),
        );
        ws.send(await buildAudioRequestFrame(new Uint8Array(audioBuffer), true));
      } catch (err) {
        ws.close();
        settle(() =>
          reject(
            err instanceof AsrServiceError
              ? err
              : new AsrServiceError('发送音频失败', 'SEND'),
          ),
        );
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data =
          event.data instanceof ArrayBuffer
            ? event.data
            : await (event.data as Blob).arrayBuffer();
        const outcome = await handleServerPacket(data, finalText);
        if (outcome === 'done') {
          settle(() => {
            ws.close();
            if (finalText.value) resolve(finalText.value);
            else reject(new AsrServiceError('识别结果为空', 'EMPTY'));
          });
        }
      } catch (err) {
        settle(() =>
          reject(
            err instanceof AsrServiceError
              ? err
              : new AsrServiceError('解析识别结果失败', 'PARSE'),
          ),
        );
      }
    };

    ws.onerror = () => {
      settle(() =>
        reject(new AsrServiceError(formatWsFailureMessage(), 'WS')),
      );
    };

    ws.onclose = (event) => {
      if (settled) return;
      settle(() => {
        if (finalText.value) resolve(finalText.value);
        else {
          reject(
            new AsrServiceError(
              formatWsFailureMessage(event.code, event.reason),
              'WS',
            ),
          );
        }
      });
    };
  });
}

async function transcribeViaNativeWebSocket(
  authHeaders: VolcAsrAuthHeaders,
  audioBuffer: ArrayBuffer,
  requestPayload: AsrRequestPayload,
): Promise<string> {
  if (!Capacitor.isPluginAvailable('HeaderWebSocket')) {
    throw new AsrServiceError(
      '原生 WebSocket 插件未加载，请重新安装最新 APK',
      'WS',
    );
  }

  const wsUrl = buildNativeWebSocketUrl();
  const headers = volcHeadersToRecord(authHeaders);

  let socketId = '';
  const listeners: PluginListenerHandle[] = [];
  const finalText = { value: '' };

  const cleanup = async () => {
    await Promise.all(listeners.map((l) => l.remove()));
    if (socketId) {
      try {
        await HeaderWebSocket.close({ socketId });
      } catch {
        /* already closed */
      }
    }
  };

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      void cleanup().finally(fn);
    };

    const timeoutId = setTimeout(() => {
      settle(() => reject(new AsrServiceError('语音识别超时', 'TIMEOUT')));
    }, WS_TIMEOUT_MS);

    void (async () => {
      try {
        const messageListener = await HeaderWebSocket.addListener(
          'message',
          async (event) => {
            if (event.socketId !== socketId) return;
            try {
              const data = base64ToArrayBuffer(event.data);
              const outcome = await handleServerPacket(data, finalText);
              if (outcome === 'done') {
                settle(() => {
                  if (finalText.value) resolve(finalText.value);
                  else reject(new AsrServiceError('识别结果为空', 'EMPTY'));
                });
              }
            } catch (err) {
              settle(() =>
                reject(
                  err instanceof AsrServiceError
                    ? err
                    : new AsrServiceError('解析识别结果失败', 'PARSE'),
                ),
              );
            }
          },
        );
        listeners.push(messageListener);

        const closeListener = await HeaderWebSocket.addListener(
          'close',
          (event) => {
            if (event.socketId !== socketId || settled) return;
            settle(() => {
              if (finalText.value) resolve(finalText.value);
              else {
                reject(
                  new AsrServiceError(
                    formatWsFailureMessage(event.code, event.reason),
                    'WS',
                  ),
                );
              }
            });
          },
        );
        listeners.push(closeListener);

        const errorListener = await HeaderWebSocket.addListener(
          'error',
          (event) => {
            if (event.socketId !== socketId || settled) return;
            settle(() =>
              reject(
                new AsrServiceError(
                  formatWsFailureMessage(event.code, event.message),
                  'WS',
                ),
              ),
            );
          },
        );
        listeners.push(errorListener);

        const { socketId: id } = await HeaderWebSocket.connect({
          url: wsUrl,
          headers,
        });
        socketId = id;

        const fullFrame = await buildFullClientRequestFrame(
          requestPayload as unknown as Record<string, unknown>,
        );
        await HeaderWebSocket.send({
          socketId,
          data: uint8ArrayToBase64(new Uint8Array(fullFrame)),
        });

        const audioFrame = await buildAudioRequestFrame(
          new Uint8Array(audioBuffer),
          true,
        );
        await HeaderWebSocket.send({
          socketId,
          data: uint8ArrayToBase64(new Uint8Array(audioFrame)),
        });
      } catch (err) {
        settle(() =>
          reject(
            err instanceof AsrServiceError
              ? err
              : new AsrServiceError(
                  err instanceof Error
                    ? err.message
                    : formatWsFailureMessage(),
                  'WS',
                ),
          ),
        );
      }
    })();
  });
}

export async function transcribeViaWebSocket(
  settings: AsrSettings,
  audioBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const apiKey = (await getAsrApiKey()) || settings.apiKey;
  if (!apiKey || !settings.resourceId) {
    throw new AsrServiceError('请配置 ASR API Key 与 Resource ID', 'CONFIG');
  }

  const requestId = generateUuid();
  const auth = {
    apiKey,
    resourceId: settings.resourceId,
    requestId,
  };
  const requestPayload = await buildAsrPayload(mimeType);
  const authHeaders = buildNewConsoleAsrHeaders(auth);

  if (Capacitor.isNativePlatform()) {
    return transcribeViaNativeWebSocket(
      authHeaders,
      audioBuffer,
      requestPayload,
    );
  }

  if (!shouldUseAsrWebSocketProxy()) {
    throw new AsrServiceError(
      '浏览器生产构建无法直连火山 ASR，请使用 npm run dev 或安装 Android App',
      'WS',
    );
  }

  const wsUrl = buildBrowserProxyWebSocketUrl(auth);
  return transcribeViaBrowserWebSocket(wsUrl, audioBuffer, requestPayload);
}
