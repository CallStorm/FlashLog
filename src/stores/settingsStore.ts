import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import type { AppSettings } from '@/types/settings';
import { normalizeWorkCategories } from '@/utils/workCategory';
import { SETTINGS_STORAGE_KEY } from '@/types/settings';
import {
  syncReminderSchedule,
  type ReminderSyncResult,
} from '@/services/reminderService';
import { getAsrApiKey, getLlmApiKey, setAsrApiKey, setLlmApiKey } from '@/services/secureConfig';

interface SettingsState {
  settings: AppSettings;
  llmKeyConfigured: boolean;
  asrConfigured: boolean;
  ttsConfigured: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  updateSettings: (
    patch: Partial<AppSettings>,
  ) => Promise<ReminderSyncResult | null>;
  updateLlm: (patch: Partial<AppSettings['llm']>) => Promise<void>;
  updateAsr: (patch: Partial<AppSettings['asr']>) => Promise<void>;
  updateTts: (patch: Partial<AppSettings['tts']>) => Promise<void>;
  setLlmApiKeyValue: (key: string) => Promise<void>;
  setAsrApiKeyValue: (key: string) => Promise<void>;
  restoreLlmDefaults: () => Promise<void>;
  restoreSystemPrompt: () => Promise<void>;
}

async function persistSettings(settings: AppSettings): Promise<void> {
  await Preferences.set({
    key: SETTINGS_STORAGE_KEY,
    value: JSON.stringify(settings),
  });
}

async function readSettings(): Promise<AppSettings> {
  const { value } = await Preferences.get({ key: SETTINGS_STORAGE_KEY });
  if (!value) return structuredClone(DEFAULT_SETTINGS);
  try {
    const parsed = JSON.parse(value) as AppSettings & {
      asr?: AppSettings['asr'] & {
        appId?: string;
        accessToken?: string;
      };
    };
    const asr = { ...DEFAULT_SETTINGS.asr, ...parsed.asr };
    const tts = { ...DEFAULT_SETTINGS.tts, ...parsed.tts };
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      llm: { ...DEFAULT_SETTINGS.llm, ...parsed.llm },
      asr,
      tts,
      reminder: { ...DEFAULT_SETTINGS.reminder, ...parsed.reminder },
      workCategories: normalizeWorkCategories(parsed.workCategories),
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

async function checkAsrConfigured(settings: AppSettings): Promise<boolean> {
  const key = await getAsrApiKey();
  return Boolean((key || settings.asr.apiKey) && settings.asr.resourceId);
}

async function checkTtsConfigured(settings: AppSettings): Promise<boolean> {
  const asrOk = await checkAsrConfigured(settings);
  return asrOk && Boolean(settings.tts.resourceId.trim() && settings.tts.speaker.trim());
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: structuredClone(DEFAULT_SETTINGS),
  llmKeyConfigured: false,
  asrConfigured: false,
  ttsConfigured: false,
  loaded: false,

  load: async () => {
    const settings = await readSettings();
    const llmKey = await getLlmApiKey();
    const asrConfigured = await checkAsrConfigured(settings);
    const ttsConfigured = await checkTtsConfigured(settings);
    set({
      settings,
      llmKeyConfigured: Boolean(llmKey),
      asrConfigured,
      ttsConfigured,
      loaded: true,
    });
    await syncReminderSchedule(settings.reminder);
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    await persistSettings(next);
    const asrConfigured = await checkAsrConfigured(next);
    const ttsConfigured = await checkTtsConfigured(next);
    set({ settings: next, asrConfigured, ttsConfigured });
    if (patch.reminder !== undefined) {
      return syncReminderSchedule(next.reminder);
    }
    return null;
  },

  updateLlm: async (patch) => {
    const next = {
      ...get().settings,
      llm: { ...get().settings.llm, ...patch },
    };
    await persistSettings(next);
    set({ settings: next });
  },

  updateAsr: async (patch) => {
    const next = {
      ...get().settings,
      asr: { ...get().settings.asr, ...patch },
    };
    await persistSettings(next);
    const asrConfigured = await checkAsrConfigured(next);
    const ttsConfigured = await checkTtsConfigured(next);
    set({ settings: next, asrConfigured, ttsConfigured });
  },

  updateTts: async (patch) => {
    const next = {
      ...get().settings,
      tts: { ...get().settings.tts, ...patch },
    };
    await persistSettings(next);
    const ttsConfigured = await checkTtsConfigured(next);
    set({ settings: next, ttsConfigured });
  },

  setLlmApiKeyValue: async (key) => {
    await setLlmApiKey(key);
    set({ llmKeyConfigured: Boolean(key) });
  },

  setAsrApiKeyValue: async (key) => {
    await setAsrApiKey(key);
    const asrConfigured = await checkAsrConfigured(get().settings);
    const ttsConfigured = await checkTtsConfigured(get().settings);
    set({ asrConfigured, ttsConfigured });
  },

  restoreLlmDefaults: async () => {
    const next = {
      ...get().settings,
      llm: {
        ...get().settings.llm,
        baseUrl: DEFAULT_SETTINGS.llm.baseUrl,
        systemPrompt: DEFAULT_SETTINGS.llm.systemPrompt,
      },
    };
    await persistSettings(next);
    set({ settings: next });
  },

  restoreSystemPrompt: async () => {
    await get().updateLlm({ systemPrompt: DEFAULT_SETTINGS.llm.systemPrompt });
  },
}));
