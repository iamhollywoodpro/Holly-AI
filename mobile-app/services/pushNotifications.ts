import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Push notification service for HOLLY mobile app.
 * 
 * Setup requirements:
 * - iOS: Upload push certificate to Expo
 * - Android: Add FCM server key to app.json under googleServicesFile
 * - Production: Use Expo Push API or a service like OneSignal
 */

// Request notification permissions
export async function requestPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Push notification permissions failed:', error);
    return false;
  }
}

// Get push token for this device
export async function getPushToken(): Promise<PushToken | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn('Push notification permission denied');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'holly-ai-mobile',
    });

    return {
      token: token.data,
      platform: Platform.OS as 'ios' | 'android',
    };
  } catch (error) {
    console.warn('Failed to get push token:', error);
    return null;
  }
}

// Schedule a local notification (for testing)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  secondsFromNow: number = 5,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { seconds: secondsFromNow },
  });
}

// Listen for incoming notifications
export function addNotificationListener(
  callback: (title: string, body: string, data?: Record<string, unknown>) => void,
) {
  return Notifications.addNotificationReceivedListener((notification) => {
    const { title, body, data } = notification.request.content;
    callback(title as string, body as string, data as Record<string, unknown>);
  });
}

// Listen for notification taps
export function addNotificationResponseListener(
  callback: (data?: Record<string, unknown>) => void,
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification.request.content.data as Record<string, unknown>);
  });
}
