import { Capacitor } from '@capacitor/core';
import type { AsrSettings } from '@/types/settings';
import { generateUuid } from '@/utils/uuid';
import {
  buildNewConsoleAsrHeaders,
  volcAsrAuthHeadersToSearchParams,
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

const WS_TIMEOUT_MS = 60_000;

/** [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh) 流式输入（录完识别） */
export const VOLC_ASR_WSS_ORIGIN = 'wss://openspeech.bytedance.com';

/** 开发态 Web 经 Vite 代理注入握手 Header（浏览器无法自定义 WebSocket Header） */
const VOLC_ASR_WS_PROXY_PREFIX = '/api/openspeech-ws';

function shouldUseAsrWebSocketProxy(): boolean {
  return import.meta.env.DEV && !Capacitor.isNativePlatform();
}

/**
 * 新版控制台鉴权必须在 WebSocket 握手 Header 中传递。
 * - 浏览器开发：走 Vite WS 代理，查询参数由代理转为 Header
 * - 原生 App：直连 openspeech（无 CORS），查询参数供网关识别
 */
export function buildAsrWebSocketUrl(auth: {
  apiKey: string;
  resourceId: string;
  requestId: string;
}): string {
  const headers = buildNewConsoleAsrHeaders(auth);
  const params = volcAsrAuthHeadersToSearchParams(headers);
  const pathWithQuery = `${VOLC_ASR_NOSTREAM_PATH}?${params.toString()}`;

  if (shouldUseAsrWebSocketProxy()) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}${VOLC_ASR_WS_PROXY_PREFIX}${pathWithQuery}`;
  }

  return `${VOLC_ASR_WSS_ORIGIN}${pathWithQuery}`;
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
  const wsUrl = buildAsrWebSocketUrl({
    apiKey,
    resourceId: settings.resourceId,
    requestId,
  });

  const { format, codec } = resolveVolcAudioConfig(mimeType);
  const requestPayload = {
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

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    let finalText = '';
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
        ws.send(await buildFullClientRequestFrame(requestPayload));
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
        const packet = await parseVolcServerPacket(data);

        if (packet.type === 'error') {
          settle(() =>
            reject(
              new AsrServiceError(
                `ASR 错误 (${packet.code}): ${packet.message}`,
                'ASR',
              ),
            ),
          );
          return;
        }

        if (packet.type !== 'response') return;

        const text = extractVolcTranscript(packet.data);
        if (text) finalText = text;

        const payload = packet.data as Record<string, unknown> | undefined;
        const utterances = (payload?.result as Record<string, unknown> | undefined)
          ?.utterances;
        const hasDefinite =
          Array.isArray(utterances) &&
          utterances.some(
            (u) => (u as Record<string, unknown>)?.definite === true,
          );

        if (packet.isFinal || hasDefinite) {
          settle(() => {
            ws.close();
            if (finalText) resolve(finalText);
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
        reject(
          new AsrServiceError(
            'WebSocket 连接失败，请检查 API Key 与 Resource ID',
            'WS',
          ),
        ),
      );
    };

    ws.onclose = (event) => {
      if (settled) return;
      settle(() => {
        if (finalText) resolve(finalText);
        else {
          reject(
            new AsrServiceError(
              event.reason || `连接已关闭 (${event.code})`,
              'WS',
            ),
          );
        }
      });
    };
  });
}
