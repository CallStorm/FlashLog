import { Capacitor } from '@capacitor/core';
import { Badge } from '@capawesome/capacitor-badge';

export async function syncAppBadge(count: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (count <= 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count });
    }
  } catch {
    // Launcher may not support badges
  }
}
