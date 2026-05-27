/**
 * SoundCloud Client — Integration Tests
 *
 * Tests the SoundCloud client library with mocked HTTP and Prisma.
 * Covers: auth URL, token exchange, API calls, track upload, insights
 */

const scMockFetch = jest.fn();
global.fetch = scMockFetch;

const originalSCEnv = process.env;

jest.mock('@/lib/db', () => ({
  prisma: {
    integration: {
      findFirst: jest.fn(),
    },
  },
}));

async function importSoundCloudClient(envOverrides: Record<string, string> = {}) {
  jest.resetModules();
  process.env = {
    ...originalSCEnv,
    SOUNDCLOUD_CLIENT_ID: 'sc_client_123',
    SOUNDCLOUD_CLIENT_SECRET: 'sc_secret_456',
    SOUNDCLOUD_REDIRECT_URI: 'http://localhost:3000/api/soundcloud/callback',
    ...envOverrides,
  };

  jest.doMock('@/lib/db', () => ({
    prisma: {
      integration: {
        findFirst: jest.fn(),
      },
    },
  }));

  return import('@/lib/music/soundcloud/soundcloud-client');
}

beforeEach(() => {
  scMockFetch.mockReset();
});

afterAll(() => {
  process.env = originalSCEnv;
});

describe('SoundCloud Client', () => {
  describe('isSoundCloudConfigured', () => {
    it('should return true when configured', async () => {
      const { isSoundCloudConfigured } = await importSoundCloudClient();
      expect(isSoundCloudConfigured()).toBe(true);
    });

    it('should return false when client ID missing', async () => {
      const { isSoundCloudConfigured } = await importSoundCloudClient({ SOUNDCLOUD_CLIENT_ID: '' });
      expect(isSoundCloudConfigured()).toBe(false);
    });
  });

  describe('buildAuthUrl', () => {
    it('should generate SoundCloud OAuth URL', async () => {
      const { buildAuthUrl } = await importSoundCloudClient();
      const url = buildAuthUrl('test_state');

      expect(url).toContain('soundcloud.com/connect');
      expect(url).toContain('client_id=sc_client_123');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=test_state');
      expect(url).toContain('scope=*');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for access token', async () => {
      const { exchangeCodeForToken } = await importSoundCloudClient();

      scMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sc_access_123',
          scope: '*',
        }),
      });

      const result = await exchangeCodeForToken('auth_code');

      expect(result.accessToken).toBe('sc_access_123');
      expect(result.scope).toBe('*');

      expect(scMockFetch).toHaveBeenCalledWith(
        'https://api.soundcloud.com/oauth2/token',
        expect.objectContaining({ method: 'POST' }),
      );

      const body = scMockFetch.mock.calls[0][1].body.toString();
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth_code');
      expect(body).toContain('client_id=sc_client_123');
      expect(body).toContain('client_secret=sc_secret_456');
    });

    it('should throw on API error', async () => {
      const { exchangeCodeForToken } = await importSoundCloudClient();

      scMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(exchangeCodeForToken('bad_code'))
        .rejects.toThrow('SoundCloud token exchange failed');
    });
  });

  describe('getAccessToken', () => {
    it('should return token from DB', async () => {
      const { getAccessToken } = await importSoundCloudClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        accessToken: 'sc_stored_token',
      });

      const token = await getAccessToken('user_123');
      expect(token).toBe('sc_stored_token');
    });

    it('should return null when no integration', async () => {
      const { getAccessToken } = await importSoundCloudClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce(null);

      const token = await getAccessToken('user_123');
      expect(token).toBeNull();
    });
  });

  describe('getMe', () => {
    it('should fetch SoundCloud user profile', async () => {
      const { getMe } = await importSoundCloudClient();

      scMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 12345,
          username: 'testuser',
          permalink: 'testuser',
          full_name: 'Test User',
          followers_count: 500,
          followings_count: 100,
          track_count: 15,
          playlist_count: 3,
          avatar_url: 'https://i1.sndcdn.com/avatar.jpg',
          permalink_url: 'https://soundcloud.com/testuser',
          verified: false,
        }),
      });

      const user = await getMe('access_token');

      expect(user.id).toBe(12345);
      expect(user.username).toBe('testuser');
      expect(user.followers_count).toBe(500);
      expect(user.verified).toBe(false);

      // Should use OAuth header format
      const headers = scMockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('OAuth access_token');
    });
  });

  describe('getMyTracks', () => {
    it('should fetch user tracks', async () => {
      const { getMyTracks } = await importSoundCloudClient();

      scMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 1, title: 'Track 1', playback_count: 1000, favoritings_count: 50, sharing: 'public' },
          { id: 2, title: 'Track 2', playback_count: 500, favoritings_count: 20, sharing: 'private' },
        ]),
      });

      const tracks = await getMyTracks('token', 10);

      expect(tracks).toHaveLength(2);
      expect(tracks[0].title).toBe('Track 1');
      expect(tracks[1].sharing).toBe('private');
    });

    it('should throw on API error', async () => {
      const { getMyTracks } = await importSoundCloudClient();

      scMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(getMyTracks('bad_token')).rejects.toThrow('SoundCloud API');
    });
  });

  describe('uploadTrackFromUrl', () => {
    it('should upload track via multipart form', async () => {
      const { uploadTrackFromUrl } = await importSoundCloudClient();

      // Mock: fetch audio → upload to SoundCloud
      scMockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
          headers: new Headers({ 'content-type': 'audio/mpeg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 999,
            title: 'New Track',
            permalink_url: 'https://soundcloud.com/testuser/new-track',
            created_at: '2026-05-27T10:00:00Z',
          }),
        });

      const result = await uploadTrackFromUrl('token', 'https://cdn.test/audio.mp3', {
        title: 'New Track',
        description: 'A new track',
        genre: 'Electronic',
        tags: ['chill', 'ambient'],
        sharing: 'public',
      });

      expect(result.id).toBe(999);
      expect(result.permalink_url).toContain('new-track');

      // Verify upload call uses FormData
      const uploadCall = scMockFetch.mock.calls[1];
      expect(uploadCall[0]).toBe('https://api.soundcloud.com/tracks');
      expect(uploadCall[1].method).toBe('POST');
      expect(uploadCall[1].body).toBeInstanceOf(FormData);
    });

    it('should throw when audio URL fetch fails', async () => {
      const { uploadTrackFromUrl } = await importSoundCloudClient();

      scMockFetch.mockResolvedValueOnce({ ok: false });

      await expect(uploadTrackFromUrl('token', 'https://bad.url/audio.mp3', {
        title: 'Test',
      })).rejects.toThrow('Could not fetch audio');
    });

    it('should throw when upload fails', async () => {
      const { uploadTrackFromUrl } = await importSoundCloudClient();

      scMockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: new Headers({ 'content-type': 'audio/mpeg' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          text: async () => 'Unprocessable Entity',
        });

      await expect(uploadTrackFromUrl('token', 'https://cdn.test/audio.mp3', {
        title: 'Test',
      })).rejects.toThrow('SoundCloud upload failed');
    });
  });

  describe('generateSCInsights', () => {
    it('should generate insights for small artist', async () => {
      const { generateSCInsights } = await importSoundCloudClient();

      const insights = generateSCInsights(
        { id: 1, username: 'test', permalink: 'test', full_name: 'Test', followers_count: 200, followings_count: 50, track_count: 5, playlist_count: 1, avatar_url: '', permalink_url: '', verified: false } as any,
        [
          { id: 1, title: 'Track 1', playback_count: 500, favoritings_count: 10, sharing: 'public' } as any,
          { id: 2, title: 'Track 2', playback_count: 200, favoritings_count: 5, sharing: 'private' } as any,
        ],
      );

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.includes('Engage actively'))).toBe(true);
      expect(insights.some(i => i.includes('Track 1'))).toBe(true);
      expect(insights.some(i => i.includes('1 private tracks'))).toBe(true);
      expect(insights.some(i => i.includes('BPM'))).toBe(true);
    });

    it('should generate insights with no tracks', async () => {
      const { generateSCInsights } = await importSoundCloudClient();

      const insights = generateSCInsights(
        { id: 1, username: 'test', permalink: 'test', full_name: 'Test', followers_count: 2000, followings_count: 100, track_count: 0, playlist_count: 0, avatar_url: '', permalink_url: '', verified: true } as any,
        [],
      );

      // Should still have some general advice
      expect(insights.some(i => i.includes('BPM'))).toBe(true);
      // Should NOT have engagement advice for large following
      expect(insights.some(i => i.includes('Engage actively'))).toBe(false);
    });
  });
});
