/**
 * Push Notification Service
 * Handles Holly's proactive notifications — evolution alerts, initiative messages,
 * curiosity discoveries, and relationship milestones.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiClient } from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type HollyNotificationType =
  | 'evolution'      // Holly evolved a new trait
  | 'initiative'     // Holly proactively reached out
  | 'curiosity'      // Holly discovered something interesting
  | 'relationship'   // Relationship milestone reached
  | 'self_improvement' // Holly improved herself
  | 'memory'         // Important memory stored
  | 'health';        // System health alert

export interface HollyNotification {
  id: string;
  type: HollyNotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: string;
}

let expoPushToken: string | null = null;

/**
 * Register for push notifications and send token to Holly server
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'holly-ai-mobile',
    });

    expoPushToken = token.data;
    console.log('[Notifications] Push token:', expoPushToken);

    // Register token with Holly server
    try {
      const client = getApiClient();
      await client.post('/api/push/register', {
        token: expoPushToken,
        platform: Platform.OS,
        deviceId: Device.modelName || 'unknown',
      });
    } catch (err) {
      console.warn('[Notifications] Failed to register with server:', err);
    }

    // Configure channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('holly-default', {
        name: 'HOLLY AI',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('holly-evolution', {
        name: 'Holly Evolution',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D4FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('holly-relationship', {
        name: 'Relationship',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
        sound: 'default',
      });
    }

    return expoPushToken;
  } catch (error) {
    console.error('[Notifications] Registration failed:', error);
    return null;
  }
}

/**
 * Listen for incoming notifications while app is foregrounded
 */
export function setupNotificationListeners(
  onNotification?: (notification: HollyNotification) => void,
  onResponse?: (notification: HollyNotification) => void,
) {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const hollyNotif = notification.request.content.data as HollyNotification;
      if (onNotification && hollyNotif) {
        onNotification(hollyNotif);
      }
    }
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const hollyNotif = response.notification.request.content.data as HollyNotification;
      if (onResponse && hollyNotif) {
        onResponse(hollyNotif);
      }
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the current push token
 */
export function getPushToken(): string | null {
  return expoPushToken;
}

/**
 * Schedule a local notification (for testing or offline support)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  secondsFromNow: number = 1,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: { seconds: secondsFromNow },
  });
}