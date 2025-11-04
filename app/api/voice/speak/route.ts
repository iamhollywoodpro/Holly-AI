import { NextRequest, NextResponse } from 'next/server';
import { VoiceInterface } from '@/lib/voice/voice-interface';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'alloy', speed = 1.0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const voiceInterface = new VoiceInterface();
    const audioBuffer = await voiceInterface.speak(text, voice, speed);

    // Return audio as base64 for easy client handling
    const base64Audio = audioBuffer.toString('base64');

    return NextResponse.json({ 
      success: true, 
      audio: base64Audio,
      mimeType: 'audio/mpeg'
    });
  } catch (error: any) {
    console.error('Voice TTS API error:', error);
    return NextResponse.json(
      { error: error.message || 'Text-to-speech failed' },
      { status: 500 }
    );
  }
}
