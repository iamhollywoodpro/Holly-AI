/**
 * GET /api/soundcloud/tracks
 * Returns user's tracks + play stats + HOLLY insights.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAccessToken, getMe, getMyTracks, generateSCInsights } from '@/lib/music/soundcloud/soundcloud-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await getAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'SoundCloud not connected', authUrl: '/api/soundcloud/auth' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));

    const [me, tracks] = await Promise.all([getMe(accessToken), getMyTracks(accessToken, limit)]);
    const insights = generateSCInsights(me, tracks);

    return NextResponse.json({ success: true, profile: me, tracks, insights });

  } catch (err: any) {
    console.error('[SoundCloud Tracks]', err);
    return NextResponse.json({ error: 'Failed to load tracks', detail: err.message }, { status: 500 });
  }
}
