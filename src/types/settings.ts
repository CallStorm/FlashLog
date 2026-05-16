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

export interface ReminderSettings {
  enabled: boolean;
  time: string;
}

export interface AppSettings {
  llm: LlmSettings;
  asr: AsrSettings;
  reminder: ReminderSettings;
}

export const SETTINGS_STORAGE_KEY = 'flashlog_settings_v1';
