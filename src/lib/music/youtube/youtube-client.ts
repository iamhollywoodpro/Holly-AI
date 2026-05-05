/**
 * HOLLY YouTube Client — Phase 13A
 *
 * YouTube Data API v3 + OAuth 2.0 Authorization Code Flow
 * Covers: channel info, video upload, analytics, playlist management
 *
 * Required env vars:
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REDIRECT_URI   (e.g. https://holly.nexamusicgroup.com/api/youtube/callback)
 *
 * Scopes used:
 *   youtube.upload           — upload videos
 *   youtube.readonly         — read channel / playlists
 *   youtube.force-ssl        — required by Google for all YouTube API calls
 *   yt-analytics.readonly    — view analytics
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db';

// ── Config ────────────────────────────────────────────────────────────────────

export const YOUTUBE_CONFIG = {
  clientId:     process.env.YOUTUBE_CLIENT_ID     ?? '',
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
  redirectUri:  process.env.YOUTUBE_REDIRECT_URI  ?? 'https://holly.nexamusicgroup.com/api/youtube/callback',
  scopes: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ].join(' '),
} as const;

export function isYouTubeConfigured(): boolean {
  return !!(YOUTUBE_CONFIG.clientId && YOUTUBE_CONFIG.clientSecret);
}

// ── OAuth Helpers ─────────────────────────────────────────────────────────────

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     YOUTUBE_CONFIG.clientId,
    redirect_uri:  YOUTUBE_CONFIG.redirectUri,
    response_type: 'code',
    scope:         YOUTUBE_CONFIG.scopes,
    access_type:   'offline',      // get refresh_token
    prompt:        'consent',      // always show consent so we get refresh_token
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ── Token Exchange ────────────────────────────────────────────────────────────

export interface YouTubeTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    Date;
  scope:        string;
  tokenType:    string;
}

export async function exchangeCodeForTokens(code: string): Promise<YouTubeTokens> {
  const body = new URLSearchParams({
    code,
    client_id:     YOUTUBE_CONFIG.clientId,
    client_secret: YOUTUBE_CONFIG.clientSecret,
    redirect_uri:  YOUTUBE_CONFIG.redirectUri,
    grant_type:    'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube token exchange failed: ${err}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(`YouTube OAuth error: ${data.error_description ?? data.error}`);

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
    scope:        data.scope,
    tokenType:    data.token_type,
  };
}

async function refreshToken(refreshTok: string): Promise<YouTubeTokens> {
  const body = new URLSearchParams({
    client_id:     YOUTUBE_CONFIG.clientId,
    client_secret: YOUTUBE_CONFIG.clientSecret,
    refresh_token: refreshTok,
    grant_type:    'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken:  data.access_token,
    refreshToken: refreshTok, // Google doesn't rotate refresh tokens
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
    scope:        data.scope ?? '',
    tokenType:    data.token_type,
  };
}

// ── DB Token Management ───────────────────────────────────────────────────────

export async function getValidAccessToken(clerkUserId: string): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: { service: 'youtube', createdBy: clerkUserId, status: 'active' },
  });
  if (!integration?.accessToken) return null;

  // Refresh if within 5-minute buffer
  if (integration.tokenExpiry && integration.tokenExpiry.getTime() < Date.now() + 300_000) {
    if (!integration.refreshToken) return null;
    try {
      const tokens = await refreshToken(integration.refreshToken);
      await prisma.integration.update({
        where: { id: integration.id },
        data:  { accessToken: tokens.accessToken, tokenExpiry: tokens.expiresAt },
      });
      return tokens.accessToken;
    } catch { return null; }
  }

  return integration.accessToken;
}

// ── YouTube API Helpers ───────────────────────────────────────────────────────

async function ytGet<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Data Fetchers ─────────────────────────────────────────────────────────────

export interface YouTubeChannel {
  id:              string;
  title:           string;
  description:     string;
  customUrl?:      string;
  thumbnailUrl:    string;
  subscriberCount: number;
  viewCount:       number;
  videoCount:      number;
  country?:        string;
  publishedAt:     string;
}

export async function getChannel(accessToken: string): Promise<YouTubeChannel> {
  const data = await ytGet<any>('/channels', accessToken, {
    part: 'snippet,statistics,brandingSettings',
    mine: 'true',
  });

  const ch  = data.items?.[0];
  if (!ch) throw new Error('No YouTube channel found');

  return {
    id:              ch.id,
    title:           ch.snippet.title,
    description:     ch.snippet.description,
    customUrl:       ch.snippet.customUrl,
    thumbnailUrl:    ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.default?.url,
    subscriberCount: parseInt(ch.statistics.subscriberCount ?? '0'),
    viewCount:       parseInt(ch.statistics.viewCount ?? '0'),
    videoCount:      parseInt(ch.statistics.videoCount ?? '0'),
    country:         ch.snippet.country,
    publishedAt:     ch.snippet.publishedAt,
  };
}

export interface YouTubeVideo {
  id:            string;
  title:         string;
  description:   string;
  thumbnailUrl:  string;
  publishedAt:   string;
  viewCount:     number;
  likeCount:     number;
  commentCount:  number;
  duration:      string;
  status:        string;
  url:           string;
}

export async function getChannelVideos(accessToken: string, maxResults = 10): Promise<YouTubeVideo[]> {
  // Get uploads playlist ID first
  const chData = await ytGet<any>('/channels', accessToken, {
    part: 'contentDetails',
    mine: 'true',
  });
  const uploadsPlaylistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Get playlist items
  const plData = await ytGet<any>('/playlistItems', accessToken, {
    part:       'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });

  const videoIds = plData.items?.map((i: any) => i.snippet.resourceId.videoId).join(',');
  if (!videoIds) return [];

  // Get video details
  const vData = await ytGet<any>('/videos', accessToken, {
    part: 'snippet,statistics,contentDetails,status',
    id:   videoIds,
  });

  return (vData.items ?? []).map((v: any) => ({
    id:           v.id,
    title:        v.snippet.title,
    description:  v.snippet.description,
    thumbnailUrl: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url,
    publishedAt:  v.snippet.publishedAt,
    viewCount:    parseInt(v.statistics?.viewCount ?? '0'),
    likeCount:    parseInt(v.statistics?.likeCount ?? '0'),
    commentCount: parseInt(v.statistics?.commentCount ?? '0'),
    duration:     v.contentDetails?.duration ?? '',
    status:       v.status?.privacyStatus ?? 'public',
    url:          `https://youtu.be/${v.id}`,
  }));
}

// ── Video Upload (Resumable Upload) ──────────────────────────────────────────

export interface VideoUploadOptions {
  title:          string;
  description:    string;
  tags?:          string[];
  categoryId?:    string;  // 10 = Music
  privacyStatus?: 'public' | 'private' | 'unlisted';
  madeForKids?:   boolean;
  thumbnailUrl?:  string;
}

export interface VideoUploadResult {
  videoId:  string;
  url:      string;
  title:    string;
  status:   string;
}

/**
 * Upload a video from a public URL.
 * Streams the remote file through to YouTube using resumable upload API.
 */
export async function uploadVideoFromUrl(
  accessToken:  string,
  videoUrl:     string,
  opts:         VideoUploadOptions,
): Promise<VideoUploadResult> {
  // Step 1: Fetch the video file
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Could not fetch video from URL: ${videoUrl}`);
  const videoBuffer = await videoRes.arrayBuffer();
  const contentType = videoRes.headers.get('content-type') ?? 'video/mp4';
  const byteLength  = videoBuffer.byteLength;

  // Step 2: Initiate resumable upload
  const metadata = {
    snippet: {
      title:       opts.title,
      description: opts.description,
      tags:        opts.tags ?? [],
      categoryId:  opts.categoryId ?? '10', // Music
    },
    status: {
      privacyStatus: opts.privacyStatus ?? 'public',
      madeForKids:   opts.madeForKids ?? false,
    },
  };

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method:  'POST',
      headers: {
        Authorization:           `Bearer ${accessToken}`,
        'Content-Type':          'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(byteLength),
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload init failed (${initRes.status}): ${err}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('No upload URL returned from YouTube');

  // Step 3: Upload the video bytes
  const uploadRes = await fetch(uploadUrl, {
    method:  'PUT',
    headers: {
      'Content-Type':   contentType,
      'Content-Length': String(byteLength),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`YouTube video upload failed (${uploadRes.status}): ${err}`);
  }

  const uploaded = await uploadRes.json();

  return {
    videoId: uploaded.id,
    url:     `https://youtu.be/${uploaded.id}`,
    title:   uploaded.snippet?.title ?? opts.title,
    status:  uploaded.status?.uploadStatus ?? 'processed',
  };
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface ChannelAnalytics {
  views:             number;
  estimatedMinutes:  number;
  subscribersGained: number;
  subscribersLost:   number;
  likes:             number;
  comments:          number;
  shares:            number;
  period:            string;
}

export async function getChannelAnalytics(
  accessToken: string,
  startDate:   string,  // YYYY-MM-DD
  endDate:     string,
): Promise<ChannelAnalytics> {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids',        'channel==MINE');
  url.searchParams.set('startDate',  startDate);
  url.searchParams.set('endDate',    endDate);
  url.searchParams.set('metrics',    'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares');
  url.searchParams.set('dimensions', '');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube Analytics ${res.status}: ${err}`);
  }

  const data = await res.json();
  const row  = data.rows?.[0] ?? [0, 0, 0, 0, 0, 0, 0];

  return {
    views:             row[0] ?? 0,
    estimatedMinutes:  row[1] ?? 0,
    subscribersGained: row[2] ?? 0,
    subscribersLost:   row[3] ?? 0,
    likes:             row[4] ?? 0,
    comments:          row[5] ?? 0,
    shares:            row[6] ?? 0,
    period:            `${startDate} to ${endDate}`,
  };
}

// ── HOLLY AI Insights ─────────────────────────────────────────────────────────

export function generateYouTubeInsights(
  channel: YouTubeChannel,
  videos:  YouTubeVideo[],
  analytics?: ChannelAnalytics,
): string[] {
  const insights: string[] = [];

  if (channel.subscriberCount < 1000) {
    insights.push('Focus on consistency — posting 2-3x/week doubles subscriber growth rate under 1K subs');
  } else if (channel.subscriberCount < 10000) {
    insights.push('You\'re in the growth phase — optimize thumbnails and titles for click-through rate improvement');
  } else {
    insights.push('Strong channel — consider YouTube Shorts for discovery and Memberships for monetization');
  }

  if (videos.length > 0) {
    const avgViews = videos.reduce((s, v) => s + v.viewCount, 0) / videos.length;
    if (avgViews > 10000) insights.push(`Averaging ${Math.round(avgViews).toLocaleString()} views/video — you have viral potential`);
    const topVideo = videos.reduce((a, b) => a.viewCount > b.viewCount ? a : b);
    insights.push(`Top performer: "${topVideo.title}" (${topVideo.viewCount.toLocaleString()} views) — replicate this format`);
  }

  if (analytics) {
    const watchHours = Math.round(analytics.estimatedMinutes / 60);
    insights.push(`${watchHours.toLocaleString()} watch hours this period — YouTube prioritizes channels above 4,000 hrs/year for monetization`);
    if (analytics.shares > 0) {
      insights.push(`${analytics.shares} shares — shareability is a key YouTube ranking signal, keep creating share-worthy content`);
    }
  }

  insights.push('Music category tip: add timestamped chapters to your music videos for better watch time tracking');
  return insights;
}
