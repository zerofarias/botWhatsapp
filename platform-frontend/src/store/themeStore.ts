/**
 * Theme Store - Manages light/dark mode preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: resolveTheme('system'),
      
      setMode: (mode) => {
        const resolvedTheme = resolveTheme(mode);
        set({ mode, resolvedTheme });
        
        // Apply theme to document
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', resolvedTheme);
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(resolvedTheme);
        }
      },
      
      toggleTheme: () => {
        const currentResolved = get().resolvedTheme;
        const newMode = currentResolved === 'light' ? 'dark' : 'light';
        get().setMode(newMode);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on load
        if (state && typeof document !== 'undefined') {
          const resolved = resolveTheme(state.mode);
          document.documentElement.setAttribute('data-theme', resolved);
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(resolved);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      const newTheme = e.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedTheme: newTheme });
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
    }
  });
}

// Selector helpers
export const selectTheme = (state: ThemeState) => state.resolvedTheme;
export const selectThemeMode = (state: ThemeState) => state.mode;
