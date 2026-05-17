import { create } from 'zustand';
import { syncAppBadge } from '@/services/badgeService';
import { computePendingDates } from '@/services/pendingWorklogService';

interface PendingState {
  pendingDates: string[];
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const usePendingStore = create<PendingState>((set) => ({
  pendingDates: [],
  count: 0,
  loading: true,

  refresh: async () => {
    set({ loading: true });
    try {
      const pendingDates = await computePendingDates();
      const count = pendingDates.length;
      set({ pendingDates, count, loading: false });
      await syncAppBadge(count);
    } catch {
      set({ loading: false });
    }
  },
}));
