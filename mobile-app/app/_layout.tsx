import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Colors } from '../constants/theme';
import { initializeAuth } from '../services/auth';
import { registerForPushNotifications, setupNotificationListeners } from '../services/notifications';

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const notificationCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeAuth();

    // Register for push notifications and set up listeners
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          console.log('[App] Push notifications registered:', token);
        }

        // Set up foreground notification listeners
        notificationCleanup.current = setupNotificationListeners(
          (notification) => {
            console.log('[App] Foreground notification:', notification.title);
          },
          (notification) => {
            console.log('[App] Notification tapped:', notification.title);
          },
        );
      } catch (err) {
        console.warn('[App] Notification setup failed:', err);
      }
    })();

    return () => {
      notificationCleanup.current?.();
    };
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
