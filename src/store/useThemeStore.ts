import { create } from 'zustand';

interface ThemeState {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  setMode: (mode: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (localStorage.getItem('nexus_theme') as 'light' | 'dark') || 'light',
  toggleTheme: () =>
    set((state) => {
      const nextMode = state.mode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('nexus_theme', nextMode);
      return { mode: nextMode };
    }),
  setMode: (mode) => {
    localStorage.setItem('nexus_theme', mode);
    set({ mode });
  },
}));
