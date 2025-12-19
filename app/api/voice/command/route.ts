import { NextRequest, NextResponse } from 'next/server';
import { voiceInterface } from '@/lib/voice/voice-interface';

export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe the voice command
    const transcription = await voiceInterface.transcribe(buffer);

    return NextResponse.json({
      success: true,
      command: transcription.text,
      language: transcription.language,
    });

  } catch (error: any) {
    console.error('Voice command error:', error);
    return NextResponse.json(
      { error: error.message || 'Voice command processing failed' },
      { status: 500 }
    );
  }
}
