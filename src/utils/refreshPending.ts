import { usePendingStore } from '@/stores/pendingStore';

export function refreshPendingWorklogs(): Promise<void> {
  return usePendingStore.getState().refresh();
}
