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
  reminder: ReminderSettings;
  workCategories: WorkCategorySettings;
}

export const SETTINGS_STORAGE_KEY = 'flashlog_settings_v1';
