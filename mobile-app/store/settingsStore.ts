import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';
export type VoiceGender = 'male' | 'female';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';

interface SettingsState {
  serverUrl: string;
  apiKey: string;
  theme: ThemeMode;
  voiceGender: VoiceGender;
  voiceSpeed: VoiceSpeed;
  voiceEnabled: boolean;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  chatModel: string;

  setServerUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setVoiceGender: (gender: VoiceGender) => void;
  setVoiceSpeed: (speed: VoiceSpeed) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setChatModel: (model: string) => void;
  resetSettings: () => void;
}

const DEFAULT_SERVER_URL = 'https://holly.nexamusicgroup.com';

const defaults: Omit<
  SettingsState,
  | 'setServerUrl'
  | 'setApiKey'
  | 'setTheme'
  | 'setVoiceGender'
  | 'setVoiceSpeed'
  | 'setVoiceEnabled'
  | 'setBiometricEnabled'
  | 'setNotificationsEnabled'
  | 'setChatModel'
  | 'resetSettings'
> = {
  serverUrl: DEFAULT_SERVER_URL,
  apiKey: '',
  theme: 'dark',
  voiceGender: 'female',
  voiceSpeed: 'normal',
  voiceEnabled: true,
  biometricEnabled: false,
  notificationsEnabled: true,
  chatModel: 'holly-v1',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setServerUrl: (serverUrl) => set({ serverUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      setTheme: (theme) => set({ theme }),
      setVoiceGender: (voiceGender) => set({ voiceGender }),
      setVoiceSpeed: (voiceSpeed) => set({ voiceSpeed }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setChatModel: (chatModel) => set({ chatModel }),
      resetSettings: () => set(defaults),
    }),
    {
      name: 'holly-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
