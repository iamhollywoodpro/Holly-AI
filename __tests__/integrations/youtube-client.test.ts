/**
 * YouTube Client — Integration Tests
 *
 * Tests the YouTube client library with mocked HTTP and Prisma.
 * Covers: auth URL, token exchange, channel info, video upload, analytics, insights
 */

const ytMockFetch = jest.fn();
global.fetch = ytMockFetch;

const originalYTEnv = process.env;

jest.mock('@/lib/db', () => ({
  prisma: {
    integration: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

async function importYouTubeClient(envOverrides: Record<string, string> = {}) {
  jest.resetModules();
  process.env = {
    ...originalYTEnv,
    YOUTUBE_CLIENT_ID: 'yt_client_123',
    YOUTUBE_CLIENT_SECRET: 'yt_secret_456',
    YOUTUBE_REDIRECT_URI: 'http://localhost:3000/api/youtube/callback',
    ...envOverrides,
  };

  jest.doMock('@/lib/db', () => ({
    prisma: {
      integration: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    },
  }));

  return import('@/lib/music/youtube/youtube-client');
}

beforeEach(() => {
  ytMockFetch.mockReset();
});

afterAll(() => {
  process.env = originalYTEnv;
});

describe('YouTube Client', () => {
  describe('isYouTubeConfigured', () => {
    it('should return true when configured', async () => {
      const { isYouTubeConfigured } = await importYouTubeClient();
      expect(isYouTubeConfigured()).toBe(true);
    });

    it('should return false when client ID missing', async () => {
      const { isYouTubeConfigured } = await importYouTubeClient({ YOUTUBE_CLIENT_ID: '' });
      expect(isYouTubeConfigured()).toBe(false);
    });
  });

  describe('buildAuthUrl', () => {
    it('should generate Google OAuth URL for YouTube', async () => {
      const { buildAuthUrl } = await importYouTubeClient();
      const url = buildAuthUrl('test_state');

      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=yt_client_123');
      expect(url).toContain('state=test_state');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
      expect(url).toContain('youtube.upload');
      expect(url).toContain('yt-analytics.readonly');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const { exchangeCodeForTokens } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'yt_access_123',
          refresh_token: 'yt_refresh_456',
          expires_in: 3600,
          scope: 'youtube.upload',
          token_type: 'Bearer',
        }),
      });

      const tokens = await exchangeCodeForTokens('auth_code');

      expect(tokens.accessToken).toBe('yt_access_123');
      expect(tokens.refreshToken).toBe('yt_refresh_456');
      expect(tokens.tokenType).toBe('Bearer');

      const body = ytMockFetch.mock.calls[0][1].body.toString();
      expect(body).toContain('code=auth_code');
      expect(body).toContain('client_id=yt_client_123');
      expect(body).toContain('client_secret=yt_secret_456');
    });

    it('should throw on API error', async () => {
      const { exchangeCodeForTokens } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"error":"invalid_grant"}',
      });

      await expect(exchangeCodeForTokens('bad_code'))
        .rejects.toThrow('YouTube token exchange failed');
    });

    it('should throw on OAuth error in response body', async () => {
      const { exchangeCodeForTokens } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'access_denied',
          error_description: 'User denied access',
        }),
      });

      await expect(exchangeCodeForTokens('code'))
        .rejects.toThrow('YouTube OAuth error');
    });
  });

  describe('getValidAccessToken', () => {
    it('should return cached token when valid', async () => {
      const { getValidAccessToken } = await importYouTubeClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        id: 'int_1',
        accessToken: 'valid_yt_token',
        refreshToken: 'refresh_1',
        tokenExpiry: new Date(Date.now() + 600_000),
      });

      const token = await getValidAccessToken('user_123');
      expect(token).toBe('valid_yt_token');
    });

    it('should refresh expired token', async () => {
      const { getValidAccessToken } = await importYouTubeClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        id: 'int_1',
        accessToken: 'expired',
        refreshToken: 'yt_refresh',
        tokenExpiry: new Date(Date.now() + 100_000), // < 5 min buffer
      });

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_token',
          expires_in: 3600,
          scope: 'youtube.upload',
          token_type: 'Bearer',
        }),
      });

      prisma.integration.update.mockResolvedValueOnce({});

      const token = await getValidAccessToken('user_123');
      expect(token).toBe('new_token');
    });

    it('should return null when no integration', async () => {
      const { getValidAccessToken } = await importYouTubeClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce(null);

      const token = await getValidAccessToken('user_123');
      expect(token).toBeNull();
    });
  });

  describe('getChannel', () => {
    it('should fetch and transform channel data', async () => {
      const { getChannel } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{
            id: 'ch_123',
            snippet: {
              title: 'Test Channel',
              description: 'A test channel',
              customUrl: '@testchannel',
              thumbnails: { high: { url: 'https://img.test/thumb.jpg' } },
              country: 'CA',
              publishedAt: '2020-01-01T00:00:00Z',
            },
            statistics: {
              subscriberCount: '1500',
              viewCount: '50000',
              videoCount: '25',
            },
          }],
        }),
      });

      const channel = await getChannel('access_token');

      expect(channel.id).toBe('ch_123');
      expect(channel.title).toBe('Test Channel');
      expect(channel.subscriberCount).toBe(1500);
      expect(channel.viewCount).toBe(50000);
      expect(channel.videoCount).toBe(25);
      expect(channel.customUrl).toBe('@testchannel');
      expect(channel.country).toBe('CA');
    });

    it('should throw when no channel found', async () => {
      const { getChannel } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await expect(getChannel('token')).rejects.toThrow('No YouTube channel found');
    });
  });

  describe('getChannelVideos', () => {
    it('should fetch channel videos', async () => {
      const { getChannelVideos } = await importYouTubeClient();

      // 3 sequential API calls: channels → playlistItems → videos
      ytMockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{ contentDetails: { relatedPlaylists: { uploads: 'PL_upload' } } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{ snippet: { resourceId: { videoId: 'vid1' } } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{
              id: 'vid1',
              snippet: { title: 'Video 1', description: 'Desc', thumbnails: { high: { url: 'https://img.test' } }, publishedAt: '2026-01-01' },
              statistics: { viewCount: '100', likeCount: '10', commentCount: '5' },
              contentDetails: { duration: 'PT3M30S' },
              status: { privacyStatus: 'public' },
            }],
          }),
        });

      const videos = await getChannelVideos('token', 5);

      expect(videos).toHaveLength(1);
      expect(videos[0].id).toBe('vid1');
      expect(videos[0].title).toBe('Video 1');
      expect(videos[0].viewCount).toBe(100);
      expect(videos[0].url).toBe('https://youtu.be/vid1');
    });

    it('should return empty when no uploads playlist', async () => {
      const { getChannelVideos } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ contentDetails: { relatedPlaylists: {} } }] }),
      });

      const videos = await getChannelVideos('token');
      expect(videos).toEqual([]);
    });
  });

  describe('uploadVideoFromUrl', () => {
    it('should perform resumable upload', async () => {
      const { uploadVideoFromUrl } = await importYouTubeClient();

      // 3 fetches: download video → init upload → upload bytes
      ytMockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: new Headers({ 'content-type': 'video/mp4' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ location: 'https://upload.youtube.com/resumable/123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'vid_uploaded',
            snippet: { title: 'My Video' },
            status: { uploadStatus: 'uploaded' },
          }),
        });

      const result = await uploadVideoFromUrl('token', 'https://cdn.test/video.mp4', {
        title: 'My Video',
        description: 'Test upload',
        tags: ['music'],
        privacyStatus: 'private',
      });

      expect(result.videoId).toBe('vid_uploaded');
      expect(result.url).toBe('https://youtu.be/vid_uploaded');
      expect(result.status).toBe('uploaded');
    });

    it('should throw when video URL fetch fails', async () => {
      const { uploadVideoFromUrl } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({ ok: false });

      await expect(uploadVideoFromUrl('token', 'https://bad.url/video.mp4', {
        title: 'Test',
        description: '',
      })).rejects.toThrow('Could not fetch video from URL');
    });

    it('should throw when init upload fails', async () => {
      const { uploadVideoFromUrl } = await importYouTubeClient();

      ytMockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: new Headers({ 'content-type': 'video/mp4' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => 'Forbidden',
        });

      await expect(uploadVideoFromUrl('token', 'https://cdn.test/video.mp4', {
        title: 'Test',
        description: '',
      })).rejects.toThrow('YouTube upload init failed');
    });

    it('should throw when no upload URL returned', async () => {
      const { uploadVideoFromUrl } = await importYouTubeClient();

      ytMockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: new Headers({ 'content-type': 'video/mp4' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({}), // No location header
        });

      await expect(uploadVideoFromUrl('token', 'https://cdn.test/video.mp4', {
        title: 'Test',
        description: '',
      })).rejects.toThrow('No upload URL returned from YouTube');
    });
  });

  describe('getChannelAnalytics', () => {
    it('should parse analytics data', async () => {
      const { getChannelAnalytics } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rows: [[1000, 500, 50, 5, 200, 30, 15]],
        }),
      });

      const analytics = await getChannelAnalytics('token', '2026-01-01', '2026-05-27');

      expect(analytics.views).toBe(1000);
      expect(analytics.estimatedMinutes).toBe(500);
      expect(analytics.subscribersGained).toBe(50);
      expect(analytics.likes).toBe(200);
      expect(analytics.period).toBe('2026-01-01 to 2026-05-27');
    });

    it('should handle missing rows gracefully', async () => {
      const { getChannelAnalytics } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const analytics = await getChannelAnalytics('token', '2026-01-01', '2026-05-27');

      expect(analytics.views).toBe(0);
      expect(analytics.likes).toBe(0);
    });

    it('should throw on API error', async () => {
      const { getChannelAnalytics } = await importYouTubeClient();

      ytMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Forbidden',
      });

      await expect(getChannelAnalytics('token', '2026-01-01', '2026-05-27'))
        .rejects.toThrow('YouTube Analytics');
    });
  });

  describe('generateYouTubeInsights', () => {
    it('should generate insights for small channel', async () => {
      const { generateYouTubeInsights } = await importYouTubeClient();

      const insights = generateYouTubeInsights(
        { id: 'ch1', title: 'Small Channel', description: '', thumbnailUrl: '', subscriberCount: 500, viewCount: 5000, videoCount: 10, publishedAt: '2024-01-01' } as any,
        [],
      );

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.includes('consistency'))).toBe(true);
    });

    it('should generate insights for growing channel', async () => {
      const { generateYouTubeInsights } = await importYouTubeClient();

      const insights = generateYouTubeInsights(
        { id: 'ch1', title: 'Growth Channel', description: '', thumbnailUrl: '', subscriberCount: 5000, viewCount: 50000, videoCount: 50, publishedAt: '2023-01-01' } as any,
        [{ id: 'v1', title: 'Hit Video', viewCount: 15000, likeCount: 500, commentCount: 100, description: '', thumbnailUrl: '', publishedAt: '2026-01-01', duration: 'PT5M', status: 'public', url: 'https://youtu.be/v1' }],
        { views: 20000, estimatedMinutes: 3000, subscribersGained: 100, subscribersLost: 5, likes: 1000, comments: 200, shares: 50, period: '28d' },
      );

      expect(insights.some(i => i.includes('growth phase'))).toBe(true);
      expect(insights.some(i => i.includes('Hit Video'))).toBe(true);
      expect(insights.some(i => i.includes('50 watch hours'))).toBe(true);
      expect(insights.some(i => i.includes('50 shares'))).toBe(true);
    });

    it('should generate insights for large channel', async () => {
      const { generateYouTubeInsights } = await importYouTubeClient();

      const insights = generateYouTubeInsights(
        { id: 'ch1', title: 'Big Channel', description: '', thumbnailUrl: '', subscriberCount: 50000, viewCount: 500000, videoCount: 200, publishedAt: '2020-01-01' } as any,
        [],
      );

      expect(insights.some(i => i.includes('YouTube Shorts'))).toBe(true);
    });
  });
});
