import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import { ANALYSIS_CHAT_STORAGE_KEY } from '@/constants/analysisDefaults';
import type { ExportRange } from '@/services/export/types';
import type { AnalysisPhase, ChatMessage } from '@/types/analysis';
import { generateUuid } from '@/utils/uuid';

interface PersistedChat {
  messages: ChatMessage[];
  lastResolvedRange?: ExportRange | null;
  voiceBroadcastEnabled?: boolean;
}

interface AnalysisChatState {
  messages: ChatMessage[];
  lastResolvedRange: ExportRange | null;
  voiceBroadcastEnabled: boolean;
  phase: AnalysisPhase;
  loaded: boolean;
  load: () => Promise<void>;
  setLastResolvedRange: (range: ExportRange | null) => void;
  toggleVoiceBroadcast: () => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setPhase: (phase: AnalysisPhase) => void;
  clearChat: () => Promise<void>;
  persist: () => Promise<void>;
}

const MAX_MESSAGES = 20;

export const useAnalysisChatStore = create<AnalysisChatState>((set, get) => ({
  messages: [],
  lastResolvedRange: null,
  voiceBroadcastEnabled: false,
  phase: 'idle',
  loaded: false,

  load: async () => {
    const { value } = await Preferences.get({ key: ANALYSIS_CHAT_STORAGE_KEY });
    if (value) {
      try {
        const data = JSON.parse(value) as PersistedChat;
        set({
          messages: data.messages ?? [],
          lastResolvedRange: data.lastResolvedRange ?? null,
          voiceBroadcastEnabled: data.voiceBroadcastEnabled ?? false,
          loaded: true,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    set({ loaded: true });
  },

  setLastResolvedRange: (range) => {
    set({ lastResolvedRange: range });
    void get().persist();
  },

  toggleVoiceBroadcast: () => {
    set((s) => ({ voiceBroadcastEnabled: !s.voiceBroadcastEnabled }));
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
    set({ messages: [], lastResolvedRange: null, phase: 'idle' });
    await Preferences.remove({ key: ANALYSIS_CHAT_STORAGE_KEY });
  },

  persist: async () => {
    const { messages, lastResolvedRange, voiceBroadcastEnabled } = get();
    const payload: PersistedChat = {
      messages,
      lastResolvedRange,
      voiceBroadcastEnabled,
    };
    await Preferences.set({
      key: ANALYSIS_CHAT_STORAGE_KEY,
      value: JSON.stringify(payload),
    });
  },
}));

export function newMessageId(): string {
  return generateUuid();
}
