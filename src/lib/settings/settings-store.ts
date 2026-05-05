import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HollySettings, DEFAULT_SETTINGS } from './default-settings';

interface SettingsStore {
  settings: HollySettings;
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<HollySettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  exportSettings: () => string;
  importSettings: (json: string) => Promise<void>;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      isSaving: false,

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/settings');
          if (response.ok) {
            const data = await response.json();
            set({ settings: { ...DEFAULT_SETTINGS, ...data.settings } });
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateSettings: async (updates: Partial<HollySettings>) => {
        const currentSettings = get().settings;
        const newSettings = {
          ...currentSettings,
          ...updates,
        };

        // Optimistic update
        set({ settings: newSettings, isSaving: true });

        try {
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: newSettings }),
          });

          if (!response.ok) {
            throw new Error('Failed to save settings');
          }
        } catch (error) {
          console.error('Failed to save settings:', error);
          // Rollback on error
          set({ settings: currentSettings });
        } finally {
          set({ isSaving: false });
        }
      },

      resetToDefaults: async () => {
        await get().updateSettings(DEFAULT_SETTINGS);
      },

      exportSettings: () => {
        return JSON.stringify(get().settings, null, 2);
      },

      importSettings: async (json: string) => {
        try {
          const imported = JSON.parse(json);
          await get().updateSettings(imported);
        } catch (error) {
          console.error('Failed to import settings:', error);
          throw error;
        }
      },
    }),
    {
      name: 'holly-settings',
      // Only persist client-side cache, server is source of truth
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
