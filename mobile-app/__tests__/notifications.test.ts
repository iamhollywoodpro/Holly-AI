/**
 * Notification Service — Unit Tests
 *
 * Tests the notification service with mocked Expo Notifications.
 * Covers: registration, listeners, local scheduling, token management.
 */

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  modelName: 'Test Device',
}));

// Mock expo-notifications
const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetExpoPushToken = jest.fn();
const mockSetChannel = jest.fn();
const mockAddReceivedListener = jest.fn();
const mockAddResponseListener = jest.fn();
const mockScheduleNotification = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: (...args: any[]) => mockGetPermissions(...args),
  requestPermissionsAsync: (...args: any[]) => mockRequestPermissions(...args),
  getExpoPushTokenAsync: (...args: any[]) => mockGetExpoPushToken(...args),
  setNotificationChannelAsync: (...args: any[]) => mockSetChannel(...args),
  addNotificationReceivedListener: (...args: any[]) => mockAddReceivedListener(...args),
  addNotificationResponseReceivedListener: (...args: any[]) => mockAddResponseListener(...args),
  scheduleNotificationAsync: (...args: any[]) => mockScheduleNotification(...args),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
  },
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock API client
jest.mock('../services/api', () => ({
  getApiClient: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({ data: {} }),
  })),
}));

import {
  registerForPushNotifications,
  setupNotificationListeners,
  getPushToken,
  scheduleLocalNotification,
  HollyNotification,
} from '../services/notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPermissions.mockReset();
  mockRequestPermissions.mockReset();
  mockGetExpoPushToken.mockReset();
  mockSetChannel.mockReset();
  mockAddReceivedListener.mockReset();
  mockAddResponseListener.mockReset();
  mockScheduleNotification.mockReset();
});

describe('Notification Service', () => {
  describe('registerForPushNotifications', () => {
    it('should return null on simulator (non-device)', async () => {
      (Device as any).isDevice = false;

      const token = await registerForPushNotifications();
      expect(token).toBeNull();

      (Device as any).isDevice = true;
    });

    it('should request permissions when not granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'undetermined' });
      mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockResolvedValueOnce({
        data: 'ExponentPushToken[abc123]',
      });

      const token = await registerForPushNotifications();

      expect(token).toBe('ExponentPushToken[abc123]');
      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('should skip permission request when already granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockResolvedValueOnce({
        data: 'ExponentPushToken[xyz789]',
      });

      const token = await registerForPushNotifications();

      expect(token).toBe('ExponentPushToken[xyz789]');
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('should return null when permission denied', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'undetermined' });
      mockRequestPermissions.mockResolvedValueOnce({ status: 'denied' });

      const token = await registerForPushNotifications();
      expect(token).toBeNull();
    });

    it('should register push token with server', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockResolvedValueOnce({
        data: 'ExponentPushToken[server123]',
      });

      await registerForPushNotifications();

      // Should have obtained token
      expect(mockGetExpoPushToken).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: expect.any(String) }),
      );
    });

    it('should create Android notification channels', async () => {
      (Platform as any).OS = 'android';

      mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockResolvedValueOnce({
        data: 'ExponentPushToken[android123]',
      });

      await registerForPushNotifications();

      expect(mockSetChannel).toHaveBeenCalledTimes(3);
      expect(mockSetChannel).toHaveBeenCalledWith(
        'holly-default',
        expect.objectContaining({ name: 'HOLLY AI' }),
      );
      expect(mockSetChannel).toHaveBeenCalledWith(
        'holly-evolution',
        expect.objectContaining({ name: 'Holly Evolution' }),
      );
      expect(mockSetChannel).toHaveBeenCalledWith(
        'holly-relationship',
        expect.objectContaining({ name: 'Relationship' }),
      );

      (Platform as any).OS = 'ios';
    });

    it('should not create Android channels on iOS', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockResolvedValueOnce({
        data: 'ExponentPushToken[ios123]',
      });

      await registerForPushNotifications();

      expect(mockSetChannel).not.toHaveBeenCalled();
    });

    it('should handle token request failure gracefully', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockRejectedValueOnce(new Error('Token error'));

      const token = await registerForPushNotifications();
      expect(token).toBeNull();
    });
  });

  describe('setupNotificationListeners', () => {
    it('should set up foreground and response listeners', () => {
      const mockRemove1 = jest.fn();
      const mockRemove2 = jest.fn();
      mockAddReceivedListener.mockReturnValueOnce({ remove: mockRemove1 });
      mockAddResponseListener.mockReturnValueOnce({ remove: mockRemove2 });

      const cleanup = setupNotificationListeners();

      expect(mockAddReceivedListener).toHaveBeenCalled();
      expect(mockAddResponseListener).toHaveBeenCalled();

      // Cleanup should remove both listeners
      cleanup();
      expect(mockRemove1).toHaveBeenCalled();
      expect(mockRemove2).toHaveBeenCalled();
    });

    it('should call onNotification for foreground notifications', () => {
      const onNotification = jest.fn();

      // Capture the listener callback
      let foregroundCallback: any;
      mockAddReceivedListener.mockImplementationOnce((cb) => {
        foregroundCallback = cb;
        return { remove: jest.fn() };
      });
      mockAddResponseListener.mockReturnValueOnce({ remove: jest.fn() });

      setupNotificationListeners(onNotification);

      // Simulate a notification
      const mockNotif: HollyNotification = {
        id: 'n1',
        type: 'evolution',
        title: 'Holly Evolved!',
        body: 'She learned something new',
        createdAt: new Date().toISOString(),
      };

      foregroundCallback({
        request: { content: { data: mockNotif } },
      });

      expect(onNotification).toHaveBeenCalledWith(mockNotif);
    });

    it('should call onResponse for notification taps', () => {
      const onResponse = jest.fn();

      let responseCallback: any;
      mockAddReceivedListener.mockReturnValueOnce({ remove: jest.fn() });
      mockAddResponseListener.mockImplementationOnce((cb) => {
        responseCallback = cb;
        return { remove: jest.fn() };
      });

      setupNotificationListeners(undefined, onResponse);

      const mockNotif: HollyNotification = {
        id: 'n2',
        type: 'relationship',
        title: 'Milestone!',
        body: 'You reached 100 messages',
        createdAt: new Date().toISOString(),
      };

      responseCallback({
        notification: { request: { content: { data: mockNotif } } },
      });

      expect(onResponse).toHaveBeenCalledWith(mockNotif);
    });
  });

  describe('getPushToken', () => {
    it('should return stored push token after registration', async () => {
      mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockGetExpoPushToken.mockResolvedValueOnce({
        data: 'ExponentPushToken[token123]',
      });

      await registerForPushNotifications();

      const token = getPushToken();
      expect(token).toBe('ExponentPushToken[token123]');
    });

    it('should return null before registration', () => {
      const token = getPushToken();
      expect(token).toBeNull();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a local notification', async () => {
      mockScheduleNotification.mockResolvedValueOnce('local_id_1');

      const id = await scheduleLocalNotification(
        'Test Title',
        'Test Body',
        { type: 'test' },
        5,
      );

      expect(id).toBe('local_id_1');
      expect(mockScheduleNotification).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { type: 'test' },
          sound: 'default',
        },
        trigger: { seconds: 5 },
      });
    });

    it('should default to 1 second delay', async () => {
      mockScheduleNotification.mockResolvedValueOnce('local_id_2');

      await scheduleLocalNotification('Title', 'Body');

      const call = mockScheduleNotification.mock.calls[0][0];
      expect(call.trigger.seconds).toBe(1);
    });

    it('should work without data parameter', async () => {
      mockScheduleNotification.mockResolvedValueOnce('local_id_3');

      await scheduleLocalNotification('Title', 'Body');

      const call = mockScheduleNotification.mock.calls[0][0];
      expect(call.content.data).toBeUndefined();
    });
  });
});
