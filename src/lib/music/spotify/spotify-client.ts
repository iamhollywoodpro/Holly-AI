/**
 * HOLLY Spotify Client — Phase 12A
 *
 * Full Spotify Web API wrapper covering:
 *  - OAuth 2.0 Authorization Code Flow (PKCE)
 *  - Token refresh
 *  - Artist streaming stats (Spotify for Artists via partner API)
 *  - User top tracks / artists / recently played
 *  - Playlist management
 *  - Track analysis (audio features)
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db';

// ── Config ────────────────────────────────────────────────────────────────────

export const SPOTIFY_CONFIG = {
  clientId:     process.env.SPOTIFY_CLIENT_ID ?? '',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
  redirectUri:  process.env.SPOTIFY_REDIRECT_URI ?? 'https://holly.nexamusicgroup.com/api/spotify/callback',
  scopes: [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-follow-read',
  ].join(' '),
} as const;

export function isSpotifyConfigured(): boolean {
  return !!(SPOTIFY_CONFIG.clientId && SPOTIFY_CONFIG.clientSecret);
}

// ── PKCE Helpers ──────────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = crypto.createHash('sha256').update(verifier).digest();
  return Buffer.from(digest).toString('base64url');
}

export function buildAuthUrl(codeVerifier: string, state: string): string {
  const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             SPOTIFY_CONFIG.clientId,
    scope:                 SPOTIFY_CONFIG.scopes,
    redirect_uri:          SPOTIFY_CONFIG.redirectUri,
    state,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

// ── Token Exchange ────────────────────────────────────────────────────────────

export interface SpotifyTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    Date;
  scope:        string;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  SPOTIFY_CONFIG.redirectUri,
    client_id:     SPOTIFY_CONFIG.clientId,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
    scope:        data.scope,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     SPOTIFY_CONFIG.clientId,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // Spotify may not return a new refresh token
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
    scope:        data.scope,
  };
}

// ── Token Management (DB) ─────────────────────────────────────────────────────

export async function getValidAccessToken(clerkUserId: string): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: { service: 'spotify', createdBy: clerkUserId, status: 'active' },
  });

  if (!integration?.accessToken) return null;

  // Check if token needs refresh (5 min buffer)
  if (integration.tokenExpiry && integration.tokenExpiry.getTime() < Date.now() + 300_000) {
    if (!integration.refreshToken) return null;
    try {
      const tokens = await refreshAccessToken(integration.refreshToken);
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken:  tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry:  tokens.expiresAt,
        },
      });
      return tokens.accessToken;
    } catch {
      return null;
    }
  }

  return integration.accessToken;
}

// ── Spotify API Calls ─────────────────────────────────────────────────────────

async function spotifyGet<T>(endpoint: string, accessToken: string): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

// ── Data Fetchers ─────────────────────────────────────────────────────────────

export interface SpotifyUser {
  id:           string;
  display_name: string;
  email:        string;
  images:       { url: string }[];
  followers:    { total: number };
  product:      string; // 'premium' | 'free'
  country:      string;
}

export async function getSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  return spotifyGet<SpotifyUser>('/me', accessToken);
}

export interface SpotifyTrack {
  id:         string;
  name:       string;
  popularity: number;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  album: {
    name:    string;
    images:  { url: string; width: number }[];
    release_date: string;
  };
  artists: { id: string; name: string }[];
}

export interface SpotifyArtist {
  id:         string;
  name:       string;
  popularity: number;
  genres:     string[];
  followers:  { total: number };
  images:     { url: string }[];
  external_urls: { spotify: string };
}

export async function getTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20,
): Promise<SpotifyTrack[]> {
  const data = await spotifyGet<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken,
  );
  return data.items;
}

export async function getTopArtists(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20,
): Promise<SpotifyArtist[]> {
  const data = await spotifyGet<{ items: SpotifyArtist[] }>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken,
  );
  return data.items;
}

export interface RecentlyPlayed {
  track:     SpotifyTrack;
  played_at: string;
}

export async function getRecentlyPlayed(
  accessToken: string,
  limit = 50,
): Promise<RecentlyPlayed[]> {
  const data = await spotifyGet<{ items: RecentlyPlayed[] }>(
    `/me/player/recently-played?limit=${limit}`,
    accessToken,
  );
  return data.items;
}

export interface AudioFeatures {
  id:               string;
  danceability:     number; // 0-1
  energy:           number; // 0-1
  key:              number; // -1=no key, 0=C, 1=C#, ...
  loudness:         number; // dB
  mode:             number; // 0=minor, 1=major
  speechiness:      number;
  acousticness:     number;
  instrumentalness: number;
  liveness:         number;
  valence:          number;
  tempo:            number; // BPM
  time_signature:   number;
}

export async function getAudioFeatures(
  accessToken: string,
  trackIds: string[],
): Promise<AudioFeatures[]> {
  const ids = trackIds.slice(0, 100).join(',');
  const data = await spotifyGet<{ audio_features: AudioFeatures[] }>(
    `/audio-features?ids=${ids}`,
    accessToken,
  );
  return data.audio_features.filter(Boolean);
}

export interface SpotifyPlaylist {
  id:          string;
  name:        string;
  description: string | null;
  public:      boolean;
  tracks:      { total: number };
  images:      { url: string }[];
  external_urls: { spotify: string };
  owner:       { display_name: string };
}

export async function getUserPlaylists(
  accessToken: string,
  limit = 20,
): Promise<SpotifyPlaylist[]> {
  const data = await spotifyGet<{ items: SpotifyPlaylist[] }>(
    `/me/playlists?limit=${limit}`,
    accessToken,
  );
  return data.items;
}

// ── HOLLY AI Analysis ─────────────────────────────────────────────────────────

export interface SpotifyStatsBundle {
  user:            SpotifyUser;
  topTracks:       SpotifyTrack[];
  topArtists:      SpotifyArtist[];
  recentlyPlayed:  RecentlyPlayed[];
  playlists:       SpotifyPlaylist[];
  audioFeatures:   AudioFeatures[];
  insights:        SpotifyInsights;
}

export interface SpotifyInsights {
  avgPopularity:     number;
  avgEnergy:         number;
  avgDanceability:   number;
  avgValence:        number;
  avgTempo:          number;
  topGenres:         string[];
  listeningTrends:   string[];
  hollyRecommendations: string[];
}

export async function buildStatsBundle(accessToken: string): Promise<SpotifyStatsBundle> {
  const [user, topTracks, topArtists, recentlyPlayed, playlists] = await Promise.all([
    getSpotifyUser(accessToken),
    getTopTracks(accessToken, 'medium_term', 20),
    getTopArtists(accessToken, 'medium_term', 20),
    getRecentlyPlayed(accessToken, 30),
    getUserPlaylists(accessToken, 10),
  ]);

  // Get audio features for top tracks
  const trackIds = topTracks.map((t) => t.id);
  const audioFeatures = trackIds.length > 0
    ? await getAudioFeatures(accessToken, trackIds)
    : [];

  const insights = generateInsights(topTracks, topArtists, audioFeatures);

  return { user, topTracks, topArtists, recentlyPlayed, playlists, audioFeatures, insights };
}

function generateInsights(
  tracks: SpotifyTrack[],
  artists: SpotifyArtist[],
  features: AudioFeatures[],
): SpotifyInsights {
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const avgPopularity   = avg(tracks.map((t) => t.popularity));
  const avgEnergy       = avg(features.map((f) => f.energy));
  const avgDanceability = avg(features.map((f) => f.danceability));
  const avgValence      = avg(features.map((f) => f.valence));
  const avgTempo        = avg(features.map((f) => f.tempo));

  // Top genres
  const genreMap: Record<string, number> = {};
  for (const artist of artists) {
    for (const genre of artist.genres) {
      genreMap[genre] = (genreMap[genre] ?? 0) + 1;
    }
  }
  const topGenres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([g]) => g);

  // Trends
  const listeningTrends: string[] = [];
  if (avgEnergy > 0.7) listeningTrends.push('High-energy music lover');
  if (avgDanceability > 0.7) listeningTrends.push('Strong preference for danceable beats');
  if (avgValence > 0.7) listeningTrends.push('Gravitates toward upbeat, positive music');
  if (avgValence < 0.3) listeningTrends.push('Prefers melancholic or introspective music');
  if (avgTempo > 130) listeningTrends.push('Favors fast-tempo tracks (130+ BPM)');
  if (avgTempo < 90) listeningTrends.push('Enjoys slower, more deliberate tempos');

  // HOLLY recommendations
  const hollyRecommendations: string[] = [];
  if (avgPopularity < 50) {
    hollyRecommendations.push('You have excellent indie taste — pitch to playlist curators who specialize in underground artists');
  } else {
    hollyRecommendations.push('Your taste tracks mainstream hits — great signal for mainstream pitch campaigns');
  }
  if (topGenres.length > 0) {
    hollyRecommendations.push(`Cross-genre opportunity: your ${topGenres[0]} roots could blend with ${topGenres[1] ?? 'pop'} for broader appeal`);
  }
  if (avgDanceability > 0.65) {
    hollyRecommendations.push('High danceability preference — club/gym playlists are prime pitching targets');
  }

  return { avgPopularity, avgEnergy, avgDanceability, avgValence, avgTempo, topGenres, listeningTrends, hollyRecommendations };
}
