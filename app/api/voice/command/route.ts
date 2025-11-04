import { NextRequest, NextResponse } from 'next/server';
import { VoiceInterface } from '@/lib/voice/voice-interface';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const voice = new VoiceInterface();
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await voice.processVoiceCommand(buffer);

    return NextResponse.json({ success: true, command: result });
  } catch (error: any) {
    console.error('Voice command API error:', error);
    return NextResponse.json(
      { error: error.message || 'Voice command processing failed' },
      { status: 500 }
    );
  }
}
