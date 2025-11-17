/**
 * Voice Settings Hook
 * Manages user preferences for HOLLY's voice output
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VoiceProvider = 'browser' | 'elevenlabs';
export type VoiceQuality = 'standard' | 'premium';

interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean; // Auto-speak all messages
  provider: VoiceProvider;
  quality: VoiceQuality;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.0 - 2.0
  volume: number; // 0.0 - 1.0
  elevenLabsVoiceId?: string;
}

interface VoiceSettingsStore extends VoiceSettings {
  toggleEnabled: () => void;
  toggleAutoSpeak: () => void;
  setProvider: (provider: VoiceProvider) => void;
  setQuality: (quality: VoiceQuality) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setElevenLabsVoiceId: (id: string) => void;
  resetToDefaults: () => void;
}

const defaultSettings: VoiceSettings = {
  enabled: true,
  autoSpeak: false, // Default OFF - user controls per message
  provider: 'elevenlabs', // USE ELEVENLABS FOR NATURAL VOICE
  quality: 'premium',
  rate: 1.0,
  pitch: 1.1, // Slightly higher pitch for feminine voice
  volume: 0.9,
  elevenLabsVoiceId: 'charlotte', // Natural, conversational voice
};

export const useVoiceSettings = create<VoiceSettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
      toggleAutoSpeak: () => set((state) => ({ autoSpeak: !state.autoSpeak })),
      setProvider: (provider) => set({ provider }),
      setQuality: (quality) => set({ quality }),
      setRate: (rate) => set({ rate: Math.max(0.5, Math.min(2.0, rate)) }),
      setPitch: (pitch) => set({ pitch: Math.max(0.0, Math.min(2.0, pitch)) }),
      setVolume: (volume) => set({ volume: Math.max(0.0, Math.min(1.0, volume)) }),
      setElevenLabsVoiceId: (id) => set({ elevenLabsVoiceId: id }),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'holly-voice-settings',
    }
  )
);
