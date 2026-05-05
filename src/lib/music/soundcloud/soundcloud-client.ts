/**
 * HOLLY SoundCloud Client — Phase 13B
 *
 * SoundCloud API v2 + OAuth 2.0
 *
 * Required env vars:
 *   SOUNDCLOUD_CLIENT_ID
 *   SOUNDCLOUD_CLIENT_SECRET
 *   SOUNDCLOUD_REDIRECT_URI  (e.g. https://holly.nexamusicgroup.com/api/soundcloud/callback)
 *
 * Scopes: non-expiring  (SoundCloud uses long-lived tokens)
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db';

// ── Config ────────────────────────────────────────────────────────────────────

export const SC_CONFIG = {
  clientId:     process.env.SOUNDCLOUD_CLIENT_ID     ?? '',
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET ?? '',
  redirectUri:  process.env.SOUNDCLOUD_REDIRECT_URI  ?? 'https://holly.nexamusicgroup.com/api/soundcloud/callback',
  apiBase:      'https://api.soundcloud.com',
} as const;

export function isSoundCloudConfigured(): boolean {
  return !!(SC_CONFIG.clientId && SC_CONFIG.clientSecret);
}

// ── OAuth Helpers ─────────────────────────────────────────────────────────────

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     SC_CONFIG.clientId,
    redirect_uri:  SC_CONFIG.redirectUri,
    response_type: 'code',
    scope:         '*',
    state,
  });
  return `https://soundcloud.com/connect?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; scope: string }> {
  const body = new URLSearchParams({
    client_id:     SC_CONFIG.clientId,
    client_secret: SC_CONFIG.clientSecret,
    redirect_uri:  SC_CONFIG.redirectUri,
    grant_type:    'authorization_code',
    code,
  });

  const res = await fetch(`${SC_CONFIG.apiBase}/oauth2/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json; charset=utf-8' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SoundCloud token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token, scope: data.scope ?? '*' };
}

// ── DB Token Management ───────────────────────────────────────────────────────

export async function getAccessToken(clerkUserId: string): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: { service: 'soundcloud', createdBy: clerkUserId, status: 'active' },
  });
  return integration?.accessToken ?? null;
}

// ── SoundCloud API Helpers ────────────────────────────────────────────────────

async function scGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${SC_CONFIG.apiBase}${path}`, {
    headers: { Authorization: `OAuth ${accessToken}`, Accept: 'application/json; charset=utf-8' },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SoundCloud API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Data Fetchers ─────────────────────────────────────────────────────────────

export interface SCUser {
  id:              number;
  username:        string;
  permalink:       string;
  full_name:       string;
  description?:    string;
  followers_count: number;
  followings_count: number;
  track_count:     number;
  playlist_count:  number;
  avatar_url:      string;
  permalink_url:   string;
  city?:           string;
  country_code?:   string;
  verified:        boolean;
}

export async function getMe(accessToken: string): Promise<SCUser> {
  return scGet<SCUser>('/me', accessToken);
}

export interface SCTrack {
  id:             number;
  title:          string;
  description?:   string;
  permalink_url:  string;
  stream_url?:    string;
  artwork_url?:   string;
  genre?:         string;
  tag_list?:      string;
  playback_count: number;
  favoritings_count: number;
  comment_count:  number;
  download_count: number;
  reposts_count:  number;
  duration:       number;  // ms
  created_at:     string;
  sharing:        string;  // public | private
  license?:       string;
  bpm?:           number;
}

export async function getMyTracks(accessToken: string, limit = 20): Promise<SCTrack[]> {
  return scGet<SCTrack[]>(`/me/tracks?limit=${limit}&linked_partitioning=1`, accessToken);
}

// ── Track Upload ──────────────────────────────────────────────────────────────

export interface TrackUploadOptions {
  title:       string;
  description?: string;
  tags?:       string[];
  genre?:      string;
  sharing?:    'public' | 'private';
  license?:    string;
  artworkUrl?: string;  // will attempt to set as artwork
}

export interface TrackUploadResult {
  id:           number;
  title:        string;
  permalink_url: string;
  created_at:   string;
}

/**
 * Upload a track from a public URL to SoundCloud.
 * SoundCloud requires multipart/form-data with the audio file.
 */
export async function uploadTrackFromUrl(
  accessToken: string,
  audioUrl:    string,
  opts:        TrackUploadOptions,
): Promise<TrackUploadResult> {
  // Fetch audio file
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Could not fetch audio: ${audioUrl}`);
  const audioBuffer = await audioRes.arrayBuffer();
  const contentType = audioRes.headers.get('content-type') ?? 'audio/mpeg';
  const fileName    = opts.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3';

  // Build multipart form
  const formData = new FormData();
  formData.append('track[title]',       opts.title);
  formData.append('track[sharing]',     opts.sharing ?? 'public');
  formData.append('track[asset_data]',  new Blob([audioBuffer], { type: contentType }), fileName);

  if (opts.description) formData.append('track[description]', opts.description);
  if (opts.genre)       formData.append('track[genre]', opts.genre);
  if (opts.license)     formData.append('track[license]', opts.license);
  if (opts.tags?.length) formData.append('track[tag_list]', opts.tags.map(t => `"${t}"`).join(' '));

  const res = await fetch(`${SC_CONFIG.apiBase}/tracks`, {
    method:  'POST',
    headers: { Authorization: `OAuth ${accessToken}`, Accept: 'application/json; charset=utf-8' },
    body:    formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SoundCloud upload failed (${res.status}): ${err}`);
  }

  const track = await res.json();
  return {
    id:            track.id,
    title:         track.title,
    permalink_url: track.permalink_url,
    created_at:    track.created_at,
  };
}

// ── HOLLY Analytics Insights ──────────────────────────────────────────────────

export function generateSCInsights(user: SCUser, tracks: SCTrack[]): string[] {
  const insights: string[] = [];

  if (user.followers_count < 500) {
    insights.push('Engage actively in SoundCloud communities — reposts from accounts with 5K+ followers can 10x your reach');
  }

  if (tracks.length > 0) {
    const totalPlays = tracks.reduce((s, t) => s + t.playback_count, 0);
    const avgPlays   = Math.round(totalPlays / tracks.length);
    insights.push(`Averaging ${avgPlays.toLocaleString()} plays/track — SoundCloud repost campaigns work best above 1,000 plays/track`);

    const mostPlayed = tracks.reduce((a, b) => a.playback_count > b.playback_count ? a : b);
    insights.push(`Top track: "${mostPlayed.title}" (${mostPlayed.playback_count.toLocaleString()} plays) — pitch this to SoundCloud premier playlists`);

    const privateCount = tracks.filter(t => t.sharing === 'private').length;
    if (privateCount > 0) {
      insights.push(`You have ${privateCount} private tracks — consider releasing them as a campaign to boost follower engagement`);
    }
  }

  insights.push('SoundCloud tip: add BPM, key, and genre metadata to appear in DJ discovery searches');
  return insights;
}
