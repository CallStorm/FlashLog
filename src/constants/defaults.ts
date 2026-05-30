import type { AppSettings, TtsSettings, WorkCategorySettings } from '@/types/settings';
import { buildCategoryClassificationBlock } from '@/utils/workCategory';

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
  "category": "{{defaultCategoryId}}",
  "durationMinutes": 90,
  "description": "精炼的工作内容描述"
}

6. category 必须从系统消息「分类指南」中选一个 id；无法判断时使用默认 id。`;

export function injectWorkCategories(
  prompt: string,
  workCategories: WorkCategorySettings,
): string {
  const withDefault = prompt.replaceAll(
    '{{defaultCategoryId}}',
    workCategories.defaultCategoryId,
  );
  const block = buildCategoryClassificationBlock(workCategories);
  if (withDefault.includes('【工时大类 category')) {
    return withDefault.replace(
      /【工时大类 category[\s\S]*?(?=\n\n\d+\.|$)/,
      block,
    );
  }
  return `${withDefault}\n\n${block}`;
}

export const DEFAULT_TTS_SETTINGS: TtsSettings = {
  resourceId: 'seed-tts-2.0',
  speaker: 'zh_female_vv_uranus_bigtts',
  model: 'seed-tts-2.0-standard',
  format: 'mp3',
  sampleRate: 24000,
};

/** 豆包语音合成模型 2.0 常用音色 · [音色列表](https://www.volcengine.com/docs/6561/1257544) */
export const TTS_SPEAKER_OPTIONS: { id: string; label: string }[] = [
  { id: 'zh_female_vv_uranus_bigtts', label: 'Vivi 2.0（女声）' },
  { id: 'zh_female_xiaohe_uranus_bigtts', label: '小何 2.0（女声）' },
  { id: 'zh_female_cancan_uranus_bigtts', label: '知性灿灿 2.0（女声）' },
  { id: 'zh_male_m191_uranus_bigtts', label: '云舟 2.0（男声）' },
  { id: 'zh_female_shuangkuaisisi_uranus_bigtts', label: '爽快思思 2.0（女声）' },
];

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
  tts: structuredClone(DEFAULT_TTS_SETTINGS),
  reminder: {
    enabled: false,
    time: '18:00',
    repeat: 'weekdays',
  },
  workCategories: { categories: [], defaultCategoryId: '' },
};

export function injectReferenceDate(prompt: string, referenceDate: string): string {
  return prompt.replaceAll('{{referenceDate}}', referenceDate);
}
