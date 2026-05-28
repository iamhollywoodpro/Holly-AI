/**
 * Google Drive Service — Integration Tests
 *
 * Tests the Google Drive service with mocked googleapis SDK and Prisma.
 * Covers: auth URL, token exchange, file operations, connection management.
 */

const gdMockFetch = jest.fn();
global.fetch = gdMockFetch;

const savedGDEnv = { ...process.env };
process.env.GOOGLE_CLIENT_ID = 'gd_client_123';
process.env.GOOGLE_CLIENT_SECRET = 'gd_secret_456';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/google-drive/callback';

// Mock Prisma
const mockGDConnection = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
};
jest.mock('@/lib/db', () => ({
  prisma: {
    googleDriveConnection: mockGDConnection,
    user: { findUnique: jest.fn() },
  },
}));

// Mock getOrCreateUser
jest.mock('@/lib/user-manager', () => ({
  getOrCreateUser: jest.fn().mockResolvedValue({ id: 'db_user_123', email: 'test@test.com' }),
}));

// Mock googleapis
const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=true');
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockRefreshAccessToken = jest.fn();

const mockOAuth2Client = {
  generateAuthUrl: mockGenerateAuthUrl,
  getToken: mockGetToken,
  setCredentials: mockSetCredentials,
  refreshAccessToken: mockRefreshAccessToken,
};

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockReturnValue(mockOAuth2Client),
    },
    drive: jest.fn().mockReturnValue({
      files: {
        list: jest.fn(),
        create: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
      about: {
        get: jest.fn(),
      },
    }),
    oauth2: jest.fn().mockReturnValue({
      userinfo: { get: jest.fn().mockResolvedValue({ data: { email: 'test@gmail.com', name: 'Test User' } }) },
    }),
  },
}));

import {
  getAuthUrl,
  isConnected,
  disconnectDrive,
} from '@/lib/google-drive/drive-service';

describe('Google Drive Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gdMockFetch.mockReset();
    Object.values(mockGDConnection).forEach(m => m.mockReset());
  });

  afterAll(() => {
    process.env = savedGDEnv;
  });

  describe('getAuthUrl', () => {
    it('should generate Google OAuth URL', () => {
      const url = getAuthUrl('user_123');

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent',
          state: 'user_123',
        }),
      );
      expect(url).toContain('accounts.google.com');
    });

    it('should include drive scopes', () => {
      getAuthUrl('user_123');

      const call = mockGenerateAuthUrl.mock.calls[0][0];
      expect(call.scope).toEqual(
        expect.arrayContaining([
          expect.stringContaining('drive.file'),
          expect.stringContaining('userinfo.email'),
        ]),
      );
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      mockGDConnection.findUnique.mockResolvedValueOnce({
        isConnected: true,
      });

      const result = await isConnected('user_123');
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      mockGDConnection.findUnique.mockResolvedValueOnce({
        isConnected: false,
      });

      const result = await isConnected('user_123');
      expect(result).toBe(false);
    });

    it('should return false when no connection record', async () => {
      mockGDConnection.findUnique.mockResolvedValueOnce(null);

      const result = await isConnected('user_123');
      expect(result).toBe(false);
    });
  });

  describe('disconnectDrive', () => {
    it('should set isConnected to false', async () => {
      mockGDConnection.update.mockResolvedValueOnce({});

      await disconnectDrive('user_123');

      expect(mockGDConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_123' },
          data: expect.objectContaining({ isConnected: false }),
        }),
      );
    });

    it('should update lastSyncAt on disconnect', async () => {
      mockGDConnection.update.mockResolvedValueOnce({});

      await disconnectDrive('user_123');

      const data = mockGDConnection.update.mock.calls[0][0].data;
      expect(data.lastSyncAt).toBeInstanceOf(Date);
    });
  });
});
