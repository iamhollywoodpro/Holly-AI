import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || '',
});

// Best female voices for HOLLY (all FREE on basic tier)
const HOLLY_VOICES = {
  rachel: 'EXAVITQu4vr4xnSDxMaL',  // Professional, warm (RECOMMENDED)
  bella: '21m00Tcm4TlvDq8ikWAM',   // Young, friendly
  elli: 'MF3mGyEYCl7XYWbV9V6O',    // Energetic, engaging
  grace: 'oWAxZDx7w5VEj9dCyTzz',   // Calm, soothing
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'rachel' } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Get voice ID
    const voiceId = HOLLY_VOICES[voice as keyof typeof HOLLY_VOICES] || HOLLY_VOICES.rachel;

    console.log(`🎤 Generating speech with ${voice} voice`);

    // Generate audio
    const audio = await elevenlabs.generate({
      voice: voiceId,
      text: text,
      model_id: 'eleven_monolingual_v1', // Optimized for English
    });

    // Convert audio stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Return audio file
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('❌ ElevenLabs error:', error);
    return NextResponse.json(
      { error: 'Voice generation failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    voices: [
      { id: 'rachel', name: 'Rachel', description: 'Professional, warm (RECOMMENDED)' },
      { id: 'bella', name: 'Bella', description: 'Young, friendly' },
      { id: 'elli', name: 'Elli', description: 'Energetic, engaging' },
      { id: 'grace', name: 'Grace', description: 'Calm, soothing' },
    ],
    default: 'rachel'
  });
}
