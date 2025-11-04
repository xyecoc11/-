'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UIMode = 'ai' | 'performance';

interface UIModeStore {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
}

export const useUIMode = create<UIModeStore>()(
  persist(
    (set) => ({
      mode: 'ai',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'ui-mode-storage',
    }
  )
);

