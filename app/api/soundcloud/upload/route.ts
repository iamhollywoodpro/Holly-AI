/**
 * POST /api/soundcloud/upload
 * Upload a track from a public URL to SoundCloud.
 *
 * Body: { audioUrl, title, description?, tags?, genre?, sharing? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAccessToken, uploadTrackFromUrl } from '@/lib/music/soundcloud/soundcloud-client';

export const runtime  = 'nodejs';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await getAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'SoundCloud not connected', authUrl: '/api/soundcloud/auth' }, { status: 403 });
    }

    const body = await req.json();
    const { audioUrl, title, description, tags, genre, sharing = 'public' } = body;

    if (!audioUrl) return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    if (!title)    return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const result = await uploadTrackFromUrl(accessToken, audioUrl, {
      title, description, tags, genre, sharing,
    });

    return NextResponse.json({
      success: true,
      track:   result,
      message: `✅ "${title}" uploaded to SoundCloud! [Listen here](${result.permalink_url})`,
    });

  } catch (err: any) {
    console.error('[SoundCloud Upload]', err);
    return NextResponse.json({ error: 'Upload failed', detail: err.message }, { status: 500 });
  }
}
