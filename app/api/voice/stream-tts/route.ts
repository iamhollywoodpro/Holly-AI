import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { synthesizeForStream } from '@/lib/voice/livekit/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const audioBuffer = await synthesizeForStream(text);
    if (!audioBuffer) {
      return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'X-Audio-Format': 'pcm-48khz-16bit-mono',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Stream TTS] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream TTS failed' },
      { status: 500 },
    );
  }
}
