import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createVoiceRoom } from '@/lib/voice/livekit/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await createVoiceRoom(userId);

    return NextResponse.json({
      success: true,
      room: config.roomName,
      token: config.userToken,
      livekitUrl: config.livekitUrl,
    });
  } catch (error) {
    console.error('[Voice Room] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Room creation failed' },
      { status: 500 },
    );
  }
}
