import { NextRequest, NextResponse } from 'next/server';
import { voiceInterface } from '@/lib/voice/voice-interface';

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed } = await request.json() as any;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Generate speech audio
    const audioBuffer = await voiceInterface.speak(text, {
      voice: voice || 'rachel',
      speed: speed || 1.0,
    });

    // Convert Buffer to base64 for response
    const audioBase64 = audioBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      format: 'mp3',
    });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error.message || 'Text-to-speech failed' },
      { status: 500 }
    );
  }
}
