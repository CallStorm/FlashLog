/** 火山豆包语音合成 · 新版控制台鉴权 · [文档 1329505](https://www.volcengine.com/docs/6561/1329505?lang=zh) */

export const VOLC_TTS_AUTH_HEADER_KEYS = [
  'X-Api-Key',
  'X-Api-Resource-Id',
  'X-Api-Request-Id',
] as const;

export type VolcTtsAuthHeaders = Record<
  (typeof VOLC_TTS_AUTH_HEADER_KEYS)[number],
  string
> & {
  'Content-Type': string;
};

export function buildTtsHeaders(options: {
  apiKey: string;
  resourceId: string;
  requestId: string;
}): VolcTtsAuthHeaders {
  return {
    'X-Api-Key': options.apiKey,
    'X-Api-Resource-Id': options.resourceId,
    'X-Api-Request-Id': options.requestId,
    'Content-Type': 'application/json',
  };
}
