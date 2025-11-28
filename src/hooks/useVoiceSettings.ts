/**
 * Voice Settings Hook
 * Manages user preferences for HOLLY's voice output
 * Simplified for Fish-Speech ONLY
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean; // Auto-speak all messages
  volume: number; // 0.0 - 1.0
}

interface VoiceSettingsStore extends VoiceSettings {
  toggleEnabled: () => void;
  toggleAutoSpeak: () => void;
  setVolume: (volume: number) => void;
  resetToDefaults: () => void;
}

const defaultSettings: VoiceSettings = {
  enabled: true,
  autoSpeak: false, // Default OFF - user controls per message
  volume: 0.9,
};

export const useVoiceSettings = create<VoiceSettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
      toggleAutoSpeak: () => set((state) => ({ autoSpeak: !state.autoSpeak })),
      setVolume: (volume) => set({ volume: Math.max(0.0, Math.min(1.0, volume)) }),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'holly-voice-settings',
    }
  )
);
