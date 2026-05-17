import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import type { WorkLogCardDraft } from '@/types/workLog';

export type HomeStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'draftReady'
  | 'streaming'
  | 'cardReview'
  | 'saved';

const DRAFT_KEY = 'flashlog_draft_v1';

interface DraftState {
  status: HomeStatus;
  draftText: string;
  streamText: string;
  card: WorkLogCardDraft | null;
  supplementText: string;
  supplementHistory: string[];
  referenceDate: string;
  setStatus: (status: HomeStatus) => void;
  setDraftText: (text: string) => void;
  appendDraftText: (text: string) => void;
  setStreamText: (text: string) => void;
  setCard: (card: WorkLogCardDraft | null) => void;
  setSupplementText: (text: string) => void;
  addSupplement: (text: string) => void;
  setReferenceDate: (date: string) => void;
  resetAfterSave: () => void;
  resetAll: () => void;
  persistDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  status: 'idle',
  draftText: '',
  streamText: '',
  card: null,
  supplementText: '',
  supplementHistory: [],
  referenceDate: '',

  setStatus: (status) => set({ status }),

  setDraftText: (draftText) => {
    set({
      draftText,
      status: draftText.trim() ? 'draftReady' : 'idle',
    });
  },

  appendDraftText: (text) => {
    const prev = get().draftText;
    const sep = prev && !prev.endsWith('\n') ? '\n' : '';
    const draftText = `${prev}${sep}${text}`.trimStart();
    set({ draftText, status: 'draftReady' });
  },

  setStreamText: (streamText) => set({ streamText }),

  setCard: (card) =>
    set({
      card,
      status: card ? 'cardReview' : get().draftText.trim() ? 'draftReady' : 'idle',
    }),

  setSupplementText: (supplementText) => set({ supplementText }),

  addSupplement: (text) => {
    const history = [...get().supplementHistory, text];
    set({ supplementHistory: history, supplementText: '' });
  },

  setReferenceDate: (referenceDate) => set({ referenceDate }),

  resetAfterSave: () =>
    set({
      status: 'idle',
      draftText: '',
      streamText: '',
      card: null,
      supplementText: '',
      supplementHistory: [],
    }),

  resetAll: () =>
    set({
      status: 'idle',
      draftText: '',
      streamText: '',
      card: null,
      supplementText: '',
      supplementHistory: [],
    }),

  persistDraft: async () => {
    const { draftText, supplementText, card } = get();
    await Preferences.set({
      key: DRAFT_KEY,
      value: JSON.stringify({ draftText, supplementText, card }),
    });
  },

  loadDraft: async () => {
    const { value } = await Preferences.get({ key: DRAFT_KEY });
    if (!value) return;
    try {
      const data = JSON.parse(value) as {
        draftText?: string;
        supplementText?: string;
        card?: WorkLogCardDraft | null;
      };
      set({
        draftText: data.draftText ?? '',
        supplementText: data.supplementText ?? '',
        card: data.card ?? null,
        status: data.card
          ? 'cardReview'
          : data.draftText?.trim()
            ? 'draftReady'
            : 'idle',
      });
    } catch {
      /* ignore */
    }
  },
}));
