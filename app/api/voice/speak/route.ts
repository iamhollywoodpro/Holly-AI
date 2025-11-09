import { NextRequest, NextResponse } from 'next/server';

/**
 * ElevenLabs TTS API Route
 * Generates high-quality voice audio using ElevenLabs
 * Falls back gracefully if API key not configured
 */
export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, stability, similarityBoost } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check if ElevenLabs API key is configured
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_elevenlabs_key') {
      return NextResponse.json(
        { 
          error: 'ElevenLabs API key not configured',
          fallback: 'browser-tts' // Tell client to use browser TTS
        },
        { status: 503 }
      );
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'EXAVITQu4vr4xnSDxMaL'}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: stability || 0.5,
            similarity_boost: similarityBoost || 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'ElevenLabs API failed',
          fallback: 'browser-tts'
        },
        { status: response.status }
      );
    }

    // Return audio stream
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
    
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate voice',
        fallback: 'browser-tts'
      },
      { status: 500 }
    );
  }
}
