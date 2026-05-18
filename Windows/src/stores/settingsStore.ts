import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSkin, AppLanguage, SettingsTab } from '../types/settings';

interface SettingsState {
  skin: AppSkin;
  language: AppLanguage;
  settingsTab: SettingsTab;

  setSkin: (skin: AppSkin) => void;
  setLanguage: (language: AppLanguage) => void;
  setSettingsTab: (tab: SettingsTab) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      skin: 'glass',
      language: 'zh-CN',
      settingsTab: 'about',

      setSkin: (skin) => set({ skin }),
      setLanguage: (language) => set({ language }),
      setSettingsTab: (tab) => set({ settingsTab: tab }),
    }),
    {
      name: 'termipet-settings',
    }
  )
);
