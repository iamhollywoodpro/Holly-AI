import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Colors } from '../constants/theme';
import { initializeAuth } from '../services/auth';

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    initializeAuth();
  }, []);

  const isDark = theme === 'dark' || theme === 'system';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
          headerTitleStyle: {
            fontWeight: '700',
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
