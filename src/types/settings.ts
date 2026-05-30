export interface LlmSettings {
  baseUrl: string;
  model: string;
  systemPrompt: string;
}

/** 火山豆包语音 · 新版控制台 · [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh) */
export interface AsrSettings {
  provider: 'volcengine';
  apiKey: string;
  resourceId: string;
}

/** 火山豆包语音合成 2.0 · [文档 1329505](https://www.volcengine.com/docs/6561/1329505?lang=zh) */
export type TtsModel = 'seed-tts-2.0-standard' | 'seed-tts-2.0-expressive';

export interface TtsSettings {
  resourceId: string;
  speaker: string;
  model: TtsModel;
  format: 'mp3';
  sampleRate: number;
}

export type ReminderRepeat = 'weekdays' | 'daily';

export interface ReminderSettings {
  enabled: boolean;
  time: string;
  repeat: ReminderRepeat;
}

export interface WorkCategory {
  id: string;
  name: string;
}

export interface WorkCategorySettings {
  categories: WorkCategory[];
  defaultCategoryId: string;
}

export interface AppSettings {
  llm: LlmSettings;
  asr: AsrSettings;
  tts: TtsSettings;
  reminder: ReminderSettings;
  workCategories: WorkCategorySettings;
}

export const SETTINGS_STORAGE_KEY = 'flashlog_settings_v1';
