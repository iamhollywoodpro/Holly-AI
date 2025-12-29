/**
 * HOLLY Gemini TTS API Route
 * Uses Google Gemini 2.5 Flash Preview TTS (FREE)
 * Replaces Fish-Speech and Oracle AI Speech
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GeminiTTSRequest {
  text: string;
  voice?: string; // One of 30 Gemini voices
  style?: string; // Natural language style prompt (e.g., "excited and happy", "calm and soothing")
  language?: string; // BCP-47 language code (e.g., "en-US", "es-US")
}

// Default voice options
const DEFAULT_VOICE = 'Puck'; // Upbeat voice
const AVAILABLE_VOICES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda',
  'Orus', 'Aoede', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus',
  'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi',
  'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima',
  'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
];

export async function POST(request: NextRequest) {
  try {
    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('[Gemini TTS] API key not configured');
      return NextResponse.json(
        { 
          error: 'Gemini API key not configured',
          details: 'Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable'
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body: GeminiTTSRequest = await request.json();
    
    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text cannot be empty' },
        { status: 400 }
      );
    }

    // Validate voice
    const voice = body.voice || DEFAULT_VOICE;
    if (!AVAILABLE_VOICES.includes(voice)) {
      return NextResponse.json(
        { 
          error: 'Invalid voice',
          details: `Voice must be one of: ${AVAILABLE_VOICES.join(', ')}`
        },
        { status: 400 }
      );
    }

    console.log('[Gemini TTS] Generating speech:', {
      textLength: body.text.length,
      voice,
      style: body.style || 'default',
      language: body.language || 'auto-detect'
    });

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview-tts' 
    });

    // Build prompt with style if provided
    let prompt = body.text;
    if (body.style) {
      prompt = `Say in a ${body.style} voice:\n${body.text}`;
    }

    // Generate speech
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      }
    });

    // Extract audio data
    const response = await result.response;
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!audioData || !audioData.data) {
      console.error('[Gemini TTS] No audio data in response');
      return NextResponse.json(
        { error: 'No audio generated' },
        { status: 500 }
      );
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData.data, 'base64');
    
    if (audioBuffer.length === 0) {
      console.error('[Gemini TTS] Empty audio buffer');
      return NextResponse.json(
        { error: 'Empty audio response' },
        { status: 500 }
      );
    }

    console.log('[Gemini TTS] ✅ Successfully generated audio:', {
      size: `${(audioBuffer.length / 1024).toFixed(2)} KB`,
      mimeType: audioData.mimeType
    });

    // Return audio with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': audioData.mimeType || 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Voice-Used': voice,
        'X-Generated-By': 'Gemini-2.5-Flash-TTS'
      }
    });

  } catch (error) {
    console.error('[Gemini TTS] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Speech generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - List available voices
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Gemini 2.5 Flash Preview TTS',
    status: 'active',
    pricing: 'FREE',
    voices: AVAILABLE_VOICES.map(voice => ({
      name: voice,
      language: 'multi-language (24 supported)',
      features: ['controllable', 'low-latency', 'natural']
    })),
    supportedLanguages: [
      'ar-EG', 'de-DE', 'en-US', 'es-US', 'fr-FR', 'hi-IN',
      'id-ID', 'it-IT', 'ja-JP', 'ko-KR', 'pt-BR', 'ru-RU',
      'nl-NL', 'pl-PL', 'th-TH', 'tr-TR', 'vi-VN', 'ro-RO',
      'uk-UA', 'bn-BD', 'en-IN', 'mr-IN', 'ta-IN', 'te-IN'
    ],
    features: [
      'Single-speaker TTS',
      'Multi-speaker TTS (podcast-like)',
      'Natural language style control',
      'Low latency',
      '32k token context window'
    ]
  });
}
