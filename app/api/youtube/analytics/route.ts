/**
 * GET /api/youtube/analytics
 * Returns channel analytics + recent videos + HOLLY's AI insights.
 *
 * Query params:
 *   period: 7d | 28d | 90d  (default: 28d)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getValidAccessToken, getChannel, getChannelVideos,
  getChannelAnalytics, generateYouTubeInsights,
} from '@/lib/music/youtube/youtube-client';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'YouTube not connected', authUrl: '/api/youtube/auth' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') ?? '28d';
    const days   = period === '7d' ? 7 : period === '90d' ? 90 : 28;

    const startDate = daysAgo(days);
    const endDate   = daysAgo(0);

    // Fetch in parallel — analytics may fail if channel is too new
    const [channel, videos, analytics] = await Promise.all([
      getChannel(accessToken),
      getChannelVideos(accessToken, 10),
      getChannelAnalytics(accessToken, startDate, endDate).catch(() => undefined),
    ]);

    const insights = generateYouTubeInsights(channel, videos, analytics);

    return NextResponse.json({
      success: true,
      period:  `Last ${days} days`,
      channel,
      videos,
      analytics,
      insights,
    });

  } catch (err: any) {
    console.error('[YouTube Analytics]', err);
    if (err.message?.includes('401')) {
      return NextResponse.json({ error: 'YouTube session expired', authUrl: '/api/youtube/auth' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to load analytics', detail: err.message }, { status: 500 });
  }
}
