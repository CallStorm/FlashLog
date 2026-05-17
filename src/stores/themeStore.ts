import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'flashlog_theme_v1';

const THEME_META_COLORS: Record<ThemeMode, string> = {
  light: '#F0F4F9',
  dark: '#121316',
};

function getMetaThemeColor(): HTMLMetaElement | null {
  return document.querySelector('meta[name="theme-color"]');
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  const meta = getMetaThemeColor();
  if (meta) {
    meta.content = THEME_META_COLORS[mode];
  }
}

export function loadStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

/** Call before React render to avoid flash of wrong theme */
export function initTheme(): ThemeMode {
  const mode = loadStoredTheme();
  applyTheme(mode);
  return mode;
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initTheme(),
  setTheme: (mode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    applyTheme(mode);
    set({ theme: mode });
  },
}));
