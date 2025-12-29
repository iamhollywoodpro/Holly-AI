import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const AVAILABLE_VOICES = [
  'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede',
  'Enceladus', 'Algenib', 'Arcas', 'Bellatrix', 'Capella'
];

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { text, voice = 'Kore', style } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Validate voice
    const selectedVoice = AVAILABLE_VOICES.includes(voice) ? voice : 'Kore';

    // Build prompt with optional style
    const prompt = style ? `Say in a ${style} way: ${text}` : text;

    // Call Gemini TTS API using REST endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedVoice
                }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate speech', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract audio data from response
    const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'No audio data in response' },
        { status: 500 }
      );
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Return audio file
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Gemini TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    voices: AVAILABLE_VOICES,
    defaultVoice: 'Kore',
    model: 'gemini-2.5-flash-preview-tts',
    free: true,
    pricing: {
      input: '$0.00',
      output: '$0.00',
      note: 'Completely FREE in Google AI Studio free tier'
    }
  });
}
