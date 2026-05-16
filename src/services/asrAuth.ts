/** 火山豆包语音 · 新版控制台鉴权 · [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh) */

export const VOLC_ASR_AUTH_HEADER_KEYS = [
  'X-Api-Key',
  'X-Api-Resource-Id',
  'X-Api-Request-Id',
  'X-Api-Sequence',
] as const;

export type VolcAsrAuthHeaders = Record<
  (typeof VOLC_ASR_AUTH_HEADER_KEYS)[number],
  string
>;

export function buildNewConsoleAsrHeaders(options: {
  apiKey: string;
  resourceId: string;
  requestId: string;
}): VolcAsrAuthHeaders {
  return {
    'X-Api-Key': options.apiKey,
    'X-Api-Resource-Id': options.resourceId,
    'X-Api-Request-Id': options.requestId,
    'X-Api-Sequence': '-1',
  };
}

export function volcAsrAuthHeadersToSearchParams(
  headers: VolcAsrAuthHeaders,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of VOLC_ASR_AUTH_HEADER_KEYS) {
    params.set(key, headers[key]);
  }
  return params;
}
