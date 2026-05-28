/**
 * Auth Service — Unit Tests
 *
 * Tests the auth service with real Clerk integration pattern.
 * Covers: token getter, fallback to API key, sign out, validate.
 */

// Mock settings store
const mockSettingsState = {
  apiKey: '',
  serverUrl: 'https://holly.nexamusicgroup.com',
  setApiKey: jest.fn(),
};

jest.mock('../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => mockSettingsState,
  },
}));

jest.mock('../services/api', () => ({
  resetApiClient: jest.fn(),
}));

import {
  getAuthToken,
  getClerkToken,
  setClerkTokenGetter,
  signOut,
  initializeAuth,
  validateApiKey,
} from '../services/auth';
import { resetApiClient } from '../services/api';

// Mock global fetch for health checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockSettingsState.apiKey = '';
  mockSettingsState.setApiKey.mockReset();
  mockFetch.mockReset();
  // Reset Clerk token getter
  setClerkTokenGetter(null);
});

describe('Auth Service', () => {
  describe('getAuthToken', () => {
    it('should return null when no Clerk and no API key', async () => {
      const token = await getAuthToken();
      expect(token).toBeNull();
    });

    it('should fall back to API key from settings', async () => {
      mockSettingsState.apiKey = 'holly_key_123';

      const token = await getAuthToken();
      expect(token).toBe('holly_key_123');
    });

    it('should prefer Clerk token over API key', async () => {
      mockSettingsState.apiKey = 'api_key_fallback';

      const mockGetter = jest.fn().mockResolvedValue('clerk_jwt_token');
      setClerkTokenGetter(mockGetter);

      const token = await getAuthToken();
      expect(token).toBe('clerk_jwt_token');
      expect(mockGetter).toHaveBeenCalled();
    });

    it('should fall back to API key when Clerk returns null', async () => {
      mockSettingsState.apiKey = 'api_key_fallback';

      const mockGetter = jest.fn().mockResolvedValue(null);
      setClerkTokenGetter(mockGetter);

      const token = await getAuthToken();
      expect(token).toBe('api_key_fallback');
    });

    it('should fall back to API key when Clerk throws', async () => {
      mockSettingsState.apiKey = 'api_key_fallback';

      const mockGetter = jest.fn().mockRejectedValue(new Error('Clerk error'));
      setClerkTokenGetter(mockGetter);

      const token = await getAuthToken();
      expect(token).toBe('api_key_fallback');
    });
  });

  describe('getClerkToken (backwards compat)', () => {
    it('should be the same function as getAuthToken', () => {
      expect(getClerkToken).toBe(getAuthToken);
    });
  });

  describe('setClerkTokenGetter', () => {
    it('should set the token getter', async () => {
      const mockGetter = jest.fn().mockResolvedValue('test_token');
      setClerkTokenGetter(mockGetter);

      const token = await getAuthToken();
      expect(token).toBe('test_token');
    });

    it('should clear the token getter with null', async () => {
      const mockGetter = jest.fn().mockResolvedValue('test_token');
      setClerkTokenGetter(mockGetter);
      setClerkTokenGetter(null);

      mockSettingsState.apiKey = 'fallback';
      const token = await getAuthToken();
      expect(token).toBe('fallback');
      expect(mockGetter).not.toHaveBeenCalled(); // Should not be called
    });
  });

  describe('signOut', () => {
    it('should clear API key from settings', async () => {
      mockSettingsState.apiKey = 'old_key';

      await signOut();

      expect(mockSettingsState.setApiKey).toHaveBeenCalledWith('');
      expect(resetApiClient).toHaveBeenCalled();
    });

    it('should clear Clerk token getter', async () => {
      const mockGetter = jest.fn().mockResolvedValue('token');
      setClerkTokenGetter(mockGetter);

      await signOut();

      // After sign out, getAuthToken should return null
      const token = await getAuthToken();
      expect(token).toBeNull();
    });
  });

  describe('initializeAuth', () => {
    it('should log success when server is reachable', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await initializeAuth();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should handle server returning non-200', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      // Should not throw
      await initializeAuth();
    });

    it('should handle server unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await initializeAuth();
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const valid = await validateApiKey('valid_key');
      expect(valid).toBe(true);
      expect(mockFetch.mock.calls[0][1].headers).toEqual({
        Authorization: 'Bearer valid_key',
      });
    });

    it('should return false for invalid key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const valid = await validateApiKey('invalid_key');
      expect(valid).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const valid = await validateApiKey('any_key');
      expect(valid).toBe(false);
    });

    it('should not send auth header for empty key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await validateApiKey('');
      expect(mockFetch.mock.calls[0][1].headers).toEqual({});
    });
  });
});
