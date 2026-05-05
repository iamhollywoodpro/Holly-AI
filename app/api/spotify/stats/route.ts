/**
 * GET /api/spotify/stats
 *
 * Returns rich Spotify listening stats + HOLLY's AI analysis:
 * - Top tracks (short/medium/long term)
 * - Top artists
 * - Recently played
 * - Playlists
 * - Audio feature averages
 * - HOLLY insights & recommendations
 *
 * Query params:
 *   timeRange: short_term | medium_term | long_term  (default: medium_term)
 *   limit:     1-50  (default: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  getValidAccessToken,
  buildStatsBundle,
  getTopTracks,
  getTopArtists,
  getRecentlyPlayed,
  getUserPlaylists,
  getAudioFeatures,
} from '@/lib/music/spotify/spotify-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = (searchParams.get('timeRange') as 'short_term' | 'medium_term' | 'long_term') ?? 'medium_term';
    const limit     = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
    const full      = searchParams.get('full') === 'true';

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Spotify not connected', authUrl: '/api/spotify/auth' },
        { status: 403 },
      );
    }

    if (full) {
      // Full bundle with insights
      const bundle = await buildStatsBundle(accessToken);

      // Update lastSyncAt
      await prisma.integration.updateMany({
        where:  { service: 'spotify', createdBy: userId },
        data:   { lastSyncAt: new Date() },
      });

      return NextResponse.json({ success: true, ...bundle });
    }

    // Partial fetch based on what was requested
    const section = searchParams.get('section') ?? 'tracks';

    if (section === 'tracks') {
      const tracks = await getTopTracks(accessToken, timeRange, limit);
      return NextResponse.json({ success: true, tracks });
    }

    if (section === 'artists') {
      const artists = await getTopArtists(accessToken, timeRange, limit);
      return NextResponse.json({ success: true, artists });
    }

    if (section === 'recent') {
      const recent = await getRecentlyPlayed(accessToken, limit);
      return NextResponse.json({ success: true, recentlyPlayed: recent });
    }

    if (section === 'playlists') {
      const playlists = await getUserPlaylists(accessToken, limit);
      return NextResponse.json({ success: true, playlists });
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  } catch (err: any) {
    console.error('[Spotify Stats] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Spotify stats', detail: err.message },
      { status: 500 },
    );
  }
}
