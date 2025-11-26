/**
 * HOLLY TTS API - Generate Speech
 * Kokoro-82M with af_heart voice
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateHollySpeech } from '@/lib/tts/tts-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  lang?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    
    // Validation
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "text" parameter' },
        { status: 400 }
      );
    }
    
    if (body.text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters.' },
        { status: 400 }
      );
    }
    
    // Generate speech
    const result = await generateHollySpeech(body.text, {
      voice: body.voice || 'af_heart',
      speed: body.speed || 1.0,
      lang: body.lang || 'en-us'
    });
    
    // Convert blob to buffer
    const buffer = Buffer.from(await result.audio.arrayBuffer());
    
    // Return audio with metadata headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename="holly-voice.wav"',
        'X-TTS-Provider': result.provider,
        'X-TTS-Duration': result.duration.toString(),
        'X-TTS-Voice': result.voice,
        'X-TTS-Fallback': result.wasFallback ? 'true' : 'false',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json(
      {
        error: 'Voice generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
