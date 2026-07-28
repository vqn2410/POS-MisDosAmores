import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSizeOption = '16px' | '18px' | '20px';
export type UIScaleOption = 100 | 125 | 150;

interface AccessibilityState {
  fontSize: FontSizeOption;
  uiScale: UIScaleOption;
  highContrast: boolean;
  largeButtons: boolean;
  largeIcons: boolean;
  reduceAnimations: boolean;
  themeMode: 'light' | 'dark';

  setFontSize: (size: FontSizeOption) => void;
  setUiScale: (scale: UIScaleOption) => void;
  setHighContrast: (enabled: boolean) => void;
  setLargeButtons: (enabled: boolean) => void;
  setLargeIcons: (enabled: boolean) => void;
  setReduceAnimations: (enabled: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  resetDefaults: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      fontSize: '16px',
      uiScale: 100,
      highContrast: false,
      largeButtons: true,
      largeIcons: true,
      reduceAnimations: false,
      themeMode: 'light', // Light theme by default as requested

      setFontSize: (fontSize) => set({ fontSize }),
      setUiScale: (uiScale) => set({ uiScale }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setLargeButtons: (largeButtons) => set({ largeButtons }),
      setLargeIcons: (largeIcons) => set({ largeIcons }),
      setReduceAnimations: (reduceAnimations) => set({ reduceAnimations }),
      setThemeMode: (themeMode) => set({ themeMode }),
      resetDefaults: () =>
        set({
          fontSize: '16px',
          uiScale: 100,
          highContrast: false,
          largeButtons: true,
          largeIcons: true,
          reduceAnimations: false,
          themeMode: 'light',
        }),
    }),
    {
      name: 'nexus_accessibility_pref',
    }
  )
);
