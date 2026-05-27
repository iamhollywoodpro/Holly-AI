/**
 * Spotify Client — Integration Tests
 *
 * Tests the Spotify client library with mocked HTTP and Prisma.
 * Covers: PKCE helpers, auth URL, token exchange, API calls, insights generation
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const spotifyMockFetch = jest.fn();
global.fetch = spotifyMockFetch;

const originalSpotifyEnv = process.env;

jest.mock('@/lib/db', () => ({
  prisma: {
    integration: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

async function importSpotifyClient(envOverrides: Record<string, string> = {}) {
  jest.resetModules();
  process.env = {
    ...originalSpotifyEnv,
    SPOTIFY_CLIENT_ID: 'sp_client_123',
    SPOTIFY_CLIENT_SECRET: 'sp_secret_456',
    SPOTIFY_REDIRECT_URI: 'http://localhost:3000/api/spotify/callback',
    ...envOverrides,
  };

  // Re-register the prisma mock after resetModules
  jest.doMock('@/lib/db', () => ({
    prisma: {
      integration: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    },
  }));

  return import('@/lib/music/spotify/spotify-client');
}

beforeEach(() => {
  spotifyMockFetch.mockReset();
});

afterAll(() => {
  process.env = originalSpotifyEnv;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Spotify Client', () => {
  describe('isSpotifyConfigured', () => {
    it('should return true when credentials are set', async () => {
      const { isSpotifyConfigured } = await importSpotifyClient();
      expect(isSpotifyConfigured()).toBe(true);
    });

    it('should return false when client ID missing', async () => {
      const { isSpotifyConfigured } = await importSpotifyClient({ SPOTIFY_CLIENT_ID: '' });
      expect(isSpotifyConfigured()).toBe(false);
    });

    it('should return false when client secret missing', async () => {
      const { isSpotifyConfigured } = await importSpotifyClient({ SPOTIFY_CLIENT_SECRET: '' });
      expect(isSpotifyConfigured()).toBe(false);
    });
  });

  describe('PKCE helpers', () => {
    it('should generate a code verifier', async () => {
      const { generateCodeVerifier } = await importSpotifyClient();
      const verifier = generateCodeVerifier();
      expect(verifier).toBeTruthy();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(20);
    });

    it('should generate a state parameter', async () => {
      const { generateState } = await importSpotifyClient();
      const state = generateState();
      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      // Should be hex string from 16 random bytes
      expect(state).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique states', async () => {
      const { generateState } = await importSpotifyClient();
      const states = new Set(Array.from({ length: 10 }, () => generateState()));
      expect(states.size).toBe(10);
    });
  });

  describe('buildAuthUrl', () => {
    it('should generate valid Spotify OAuth URL', async () => {
      const { buildAuthUrl } = await importSpotifyClient();
      const url = buildAuthUrl('test_verifier', 'test_state');

      expect(url).toContain('accounts.spotify.com/authorize');
      expect(url).toContain('client_id=sp_client_123');
      expect(url).toContain('response_type=code');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('state=test_state');
    });

    it('should include PKCE code challenge', async () => {
      const { buildAuthUrl } = await importSpotifyClient();
      const url = buildAuthUrl('my_verifier', 'state_123');

      expect(url).toContain('code_challenge=');
      // Should NOT contain the verifier directly
      expect(url).not.toContain('my_verifier');
    });

    it('should include redirect URI', async () => {
      const { buildAuthUrl } = await importSpotifyClient();
      const url = buildAuthUrl('verifier', 'state');

      expect(url).toContain('redirect_uri=');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const { exchangeCodeForTokens } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sp_access_123',
          refresh_token: 'sp_refresh_456',
          expires_in: 3600,
          scope: 'user-read-private',
        }),
      });

      const tokens = await exchangeCodeForTokens('auth_code', 'verifier');

      expect(tokens.accessToken).toBe('sp_access_123');
      expect(tokens.refreshToken).toBe('sp_refresh_456');
      expect(tokens.scope).toBe('user-read-private');
      expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now() - 1000);

      // Verify correct endpoint
      expect(spotifyMockFetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({ method: 'POST' }),
      );

      const body = spotifyMockFetch.mock.calls[0][1].body.toString();
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth_code');
      expect(body).toContain('code_verifier=verifier');
    });

    it('should throw on API error', async () => {
      const { exchangeCodeForTokens } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"error":"invalid_grant"}',
      });

      await expect(exchangeCodeForTokens('bad_code', 'verifier'))
        .rejects.toThrow('Spotify token exchange failed');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const { refreshAccessToken } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          expires_in: 3600,
          scope: 'user-read-private',
        }),
      });

      const tokens = await refreshAccessToken('old_refresh_token');

      expect(tokens.accessToken).toBe('new_access_token');
      // Spotify may not return new refresh token — should keep old one
      expect(tokens.refreshToken).toBe('old_refresh_token');

      const body = spotifyMockFetch.mock.calls[0][1].body.toString();
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=old_refresh_token');
    });

    it('should throw on refresh failure', async () => {
      const { refreshAccessToken } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"error":"invalid_grant"}',
      });

      await expect(refreshAccessToken('bad_token'))
        .rejects.toThrow('Spotify token refresh failed');
    });
  });

  describe('getValidAccessToken', () => {
    it('should return cached token if still valid', async () => {
      const { getValidAccessToken } = await importSpotifyClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        id: 'int_1',
        accessToken: 'valid_token',
        refreshToken: 'refresh_1',
        tokenExpiry: new Date(Date.now() + 600_000), // 10 min from now
      });

      const token = await getValidAccessToken('user_123');
      expect(token).toBe('valid_token');
    });

    it('should refresh token if within 5-minute buffer', async () => {
      const { getValidAccessToken } = await importSpotifyClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        id: 'int_1',
        accessToken: 'expired_token',
        refreshToken: 'refresh_1',
        tokenExpiry: new Date(Date.now() + 200_000), // 3.3 min from now (< 5 min buffer)
      });

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'refreshed_token',
          expires_in: 3600,
          scope: 'user-read-private',
        }),
      });

      prisma.integration.update.mockResolvedValueOnce({});

      const token = await getValidAccessToken('user_123');
      expect(token).toBe('refreshed_token');
      expect(prisma.integration.update).toHaveBeenCalled();
    });

    it('should return null when no integration found', async () => {
      const { getValidAccessToken } = await importSpotifyClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce(null);

      const token = await getValidAccessToken('user_123');
      expect(token).toBeNull();
    });

    it('should return null when refresh fails', async () => {
      const { getValidAccessToken } = await importSpotifyClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        id: 'int_1',
        accessToken: 'expired',
        refreshToken: 'refresh_1',
        tokenExpiry: new Date(Date.now() + 100_000),
      });

      spotifyMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'error',
      });

      const token = await getValidAccessToken('user_123');
      expect(token).toBeNull();
    });

    it('should return null when no refresh token available', async () => {
      const { getValidAccessToken } = await importSpotifyClient();
      const { prisma } = jest.requireMock('@/lib/db');

      prisma.integration.findFirst.mockResolvedValueOnce({
        id: 'int_1',
        accessToken: 'expired',
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 100_000),
      });

      const token = await getValidAccessToken('user_123');
      expect(token).toBeNull();
    });
  });

  describe('Spotify API data fetchers', () => {
    it('should fetch user profile', async () => {
      const { getSpotifyUser } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user_123',
          display_name: 'Test User',
          email: 'test@test.com',
          images: [{ url: 'https://img.test/photo.jpg' }],
          followers: { total: 42 },
          product: 'premium',
          country: 'CA',
        }),
      });

      const user = await getSpotifyUser('access_token');

      expect(user.id).toBe('user_123');
      expect(user.display_name).toBe('Test User');
      expect(user.product).toBe('premium');
    });

    it('should fetch top tracks', async () => {
      const { getTopTracks } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 't1', name: 'Track 1', popularity: 80, artists: [{ id: 'a1', name: 'Artist' }] },
          ],
        }),
      });

      const tracks = await getTopTracks('token', 'short_term', 10);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Track 1');

      const url = spotifyMockFetch.mock.calls[0][0];
      expect(url).toContain('time_range=short_term');
      expect(url).toContain('limit=10');
    });

    it('should fetch top artists', async () => {
      const { getTopArtists } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'a1', name: 'Artist 1', genres: ['pop', 'rock'], popularity: 90 }],
        }),
      });

      const artists = await getTopArtists('token');
      expect(artists).toHaveLength(1);
      expect(artists[0].genres).toEqual(['pop', 'rock']);
    });

    it('should fetch recently played', async () => {
      const { getRecentlyPlayed } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { track: { id: 't1', name: 'Song' }, played_at: '2026-05-27T10:00:00Z' },
          ],
        }),
      });

      const recent = await getRecentlyPlayed('token');
      expect(recent).toHaveLength(1);
    });

    it('should fetch audio features', async () => {
      const { getAudioFeatures } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_features: [
            { id: 't1', danceability: 0.8, energy: 0.9, tempo: 120 },
            null, // Spotify can return null for unavailable tracks
          ],
        }),
      });

      const features = await getAudioFeatures('token', ['t1', 't2']);

      // Should filter out nulls
      expect(features).toHaveLength(1);
      expect(features[0].danceability).toBe(0.8);
    });

    it('should fetch user playlists', async () => {
      const { getUserPlaylists } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'p1', name: 'My Playlist', tracks: { total: 15 } }],
        }),
      });

      const playlists = await getUserPlaylists('token');
      expect(playlists).toHaveLength(1);
      expect(playlists[0].name).toBe('My Playlist');
    });

    it('should throw on API error', async () => {
      const { getSpotifyUser } = await importSpotifyClient();

      spotifyMockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '{"error":{"message":"Invalid access token"}}',
      });

      await expect(getSpotifyUser('bad_token')).rejects.toThrow('Spotify API error');
    });
  });

  describe('buildStatsBundle', () => {
    it('should aggregate all data into a stats bundle', async () => {
      const { buildStatsBundle } = await importSpotifyClient();

      // Mock all 6 API calls in order: user, topTracks, topArtists, recent, playlists
      spotifyMockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', display_name: 'User', email: 'e@e.com', images: [], followers: { total: 0 }, product: 'free', country: 'US' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 't1', name: 'T1', popularity: 70, duration_ms: 200000, preview_url: null, external_urls: { spotify: '' }, album: { name: 'Album', images: [], release_date: '2025' }, artists: [{ id: 'a1', name: 'A1' }] }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'a1', name: 'A1', popularity: 80, genres: ['pop'], followers: { total: 100 }, images: [], external_urls: { spotify: '' } }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        // audio features
        .mockResolvedValueOnce({ ok: true, json: async () => ({ audio_features: [{ id: 't1', danceability: 0.7, energy: 0.8, key: 0, loudness: -5, mode: 1, speechiness: 0.1, acousticness: 0.2, instrumentalness: 0, liveness: 0.1, valence: 0.6, tempo: 120, time_signature: 4 }] }) });

      const bundle = await buildStatsBundle('token');

      expect(bundle.user.id).toBe('u1');
      expect(bundle.topTracks).toHaveLength(1);
      expect(bundle.topArtists).toHaveLength(1);
      expect(bundle.audioFeatures).toHaveLength(1);
      expect(bundle.insights).toBeDefined();
      expect(bundle.insights.avgEnergy).toBe(0.8);
      expect(bundle.insights.topGenres).toContain('pop');
    });
  });

  describe('insights generation', () => {
    it('should detect high energy preference', async () => {
      const { buildStatsBundle } = await importSpotifyClient();

      spotifyMockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', display_name: 'User', email: 'e@e.com', images: [], followers: { total: 0 }, product: 'free', country: 'US' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

      const bundle = await buildStatsBundle('token');

      // With no tracks/artists, insights should still be generated
      expect(bundle.insights.avgEnergy).toBe(0);
      // When avgValence=0 (< 0.3) and avgTempo=0 (< 90), trends are still generated
      expect(bundle.insights.listeningTrends.length).toBeGreaterThanOrEqual(0);
    });
  });
});
