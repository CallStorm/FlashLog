import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import { ANALYSIS_CHAT_STORAGE_KEY } from '@/constants/analysisDefaults';
import {
  defaultCustomRange,
  rangesEqual,
  resolveActiveRange,
} from '@/services/analysis/analysisRange';
import type { ExportRange } from '@/services/export/types';
import type {
  AnalysisPhase,
  ChatMessage,
  PickerPreset,
} from '@/types/analysis';
import { generateUuid } from '@/utils/uuid';

interface PersistedChat {
  messages: ChatMessage[];
  picker: PickerPreset;
  customRange?: ExportRange;
}

interface AnalysisChatState {
  messages: ChatMessage[];
  picker: PickerPreset;
  customRange: ExportRange;
  phase: AnalysisPhase;
  loaded: boolean;
  load: () => Promise<void>;
  getActiveRange: () => ExportRange;
  /** 顶部切换时间：更新范围并清空对话 */
  changeRangeFromUI: (preset: PickerPreset, customRange?: ExportRange) => void;
  /** 意图/分析过程中调整范围，不清空对话 */
  setPickerQuiet: (preset: PickerPreset) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setPhase: (phase: AnalysisPhase) => void;
  clearChat: () => Promise<void>;
  persist: () => Promise<void>;
}

const MAX_MESSAGES = 20;

export const useAnalysisChatStore = create<AnalysisChatState>((set, get) => ({
  messages: [],
  picker: 'this_week',
  customRange: defaultCustomRange(),
  phase: 'idle',
  loaded: false,

  load: async () => {
    const { value } = await Preferences.get({ key: ANALYSIS_CHAT_STORAGE_KEY });
    if (value) {
      try {
        const data = JSON.parse(value) as PersistedChat;
        const customRange = data.customRange ?? defaultCustomRange();
        set({
          messages: data.messages ?? [],
          picker: data.picker ?? 'this_week',
          customRange,
          loaded: true,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    set({ loaded: true });
  },

  getActiveRange: () => {
    const { picker, customRange } = get();
    return resolveActiveRange(picker, customRange);
  },

  changeRangeFromUI: (preset, customRangeInput) => {
    const state = get();
    const prevActive = resolveActiveRange(state.picker, state.customRange);
    const nextCustom =
      preset === 'custom'
        ? (customRangeInput ?? state.customRange)
        : state.customRange;
    const nextActive = resolveActiveRange(preset, nextCustom);
    const rangeChanged = !rangesEqual(prevActive, nextActive) || state.picker !== preset;

    set({
      picker: preset,
      customRange: nextCustom,
      ...(rangeChanged ? { messages: [], phase: 'idle' as AnalysisPhase } : {}),
    });
    void get().persist();
  },

  setPickerQuiet: (picker) => {
    set({ picker });
    void get().persist();
  },

  addMessage: (msg) => {
    set((s) => {
      const messages = [...s.messages, msg].slice(-MAX_MESSAGES);
      return { messages };
    });
    void get().persist();
  },

  updateMessage: (id, patch) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
    void get().persist();
  },

  setPhase: (phase) => set({ phase }),

  clearChat: async () => {
    set({ messages: [], phase: 'idle' });
    await Preferences.remove({ key: ANALYSIS_CHAT_STORAGE_KEY });
  },

  persist: async () => {
    const { messages, picker, customRange } = get();
    const payload: PersistedChat = { messages, picker, customRange };
    await Preferences.set({
      key: ANALYSIS_CHAT_STORAGE_KEY,
      value: JSON.stringify(payload),
    });
  },
}));

export function newMessageId(): string {
  return generateUuid();
}
