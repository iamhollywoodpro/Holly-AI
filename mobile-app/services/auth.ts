import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../store/settingsStore';

const TOKEN_KEY = 'holly_auth_token';
const BIOMETRIC_ENABLED_KEY = 'holly_biometric_enabled';

export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(
  promptMessage = 'Authenticate to access HOLLY AI',
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

export async function initializeAuth(): Promise<void> {
  const { apiKey, serverUrl } = useSettingsStore.getState();
  if (apiKey) {
    await saveAuthToken(apiKey);
  }
}

export async function performAppUnlock(): Promise<boolean> {
  const enabled = await isBiometricEnabled();
  if (!enabled) return true;

  const available = await isBiometricAvailable();
  if (!available) return true;

  return authenticateWithBiometrics('Unlock HOLLY AI');
}
