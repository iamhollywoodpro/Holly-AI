import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken } from 'livekit-server-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const roomName = body.room || `holly-voice-${userId.substring(0, 12)}`;
    const participantName = body.participantName || 'user';
    const isAgent = body.agent === true;

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: isAgent ? 'holly-agent' : participantName,
      name: isAgent ? 'HOLLY' : participantName,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      success: true,
      token: await token.toJwt(),
      url: LIVEKIT_URL,
      roomName,
    });
  } catch (error) {
    console.error('[LiveKit Token] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Token generation failed' },
      { status: 500 },
    );
  }
}
