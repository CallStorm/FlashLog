import type { AppSettings } from '@/types/settings';

export const DEFAULT_LLM_BASE_URL =
  'https://ark.cn-beijing.volces.com/api/v3';

export const DEFAULT_SYSTEM_PROMPT = `你是一个严谨的职场助理。请将用户口述或输入的工作内容提炼为一张标准、精炼的工时日志卡片。

规则：
1. 语言职场化，去掉口语与废话。
2. 合理估算 durationMinutes（整数，单位：分钟），单条建议 15~480。
3. 今日参考日期为 {{referenceDate}}。若用户未提及其他日期，输出的 date 必须等于 {{referenceDate}}。
4. 若用户明确其他日期（如「昨天」「5月14日」），请解析为 YYYY-MM-DD 写入 date。
5. 只输出一个 JSON 对象，不要 Markdown 代码块，不要额外解释文字。

输出格式（严格遵守）：
{
  "date": "YYYY-MM-DD",
  "title": "任务或模块名",
  "durationMinutes": 90,
  "description": "精炼的工作内容描述"
}`;

export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    baseUrl: DEFAULT_LLM_BASE_URL,
    model: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  },
  asr: {
    provider: 'volcengine',
    apiKey: '',
    resourceId: 'volc.bigasr.sauc.duration',
  },
  reminder: {
    enabled: false,
    time: '18:00',
  },
};

export function injectReferenceDate(prompt: string, referenceDate: string): string {
  return prompt.replaceAll('{{referenceDate}}', referenceDate);
}
