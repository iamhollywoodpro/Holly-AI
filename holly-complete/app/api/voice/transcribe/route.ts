import { NextRequest, NextResponse } from 'next/server';
import { VoiceInterface } from '@/lib/voice/voice-interface';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const voice = new VoiceInterface();
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await voice.transcribe(buffer, language);

    return NextResponse.json({ success: true, transcription: result });
  } catch (error: any) {
    console.error('Voice transcription API error:', error);
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}
