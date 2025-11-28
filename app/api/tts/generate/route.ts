// app/api/tts/generate/route.ts
// HOLLY TTS API Route - Proxy to Self-Hosted Service
// Created for Steve "Hollywood" Dorego

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface TTSRequest {
  text: string;
  voice?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get TTS service URL from environment
    const ttsApiUrl = process.env.TTS_API_URL || process.env.NEXT_PUBLIC_TTS_API_URL;
    
    if (!ttsApiUrl) {
      console.error('[TTS API] TTS_API_URL not configured');
      return NextResponse.json(
        { 
          error: 'TTS service not configured',
          details: 'Please set TTS_API_URL environment variable'
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body: TTSRequest = await request.json();
    
    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text cannot be empty' },
        { status: 400 }
      );
    }

    console.log('[TTS API] Proxying request to self-hosted service:', {
      textLength: body.text.length,
      voice: body.voice || 'af_heart',
      serviceUrl: ttsApiUrl
    });

    // Forward request to Fish-Speech TTS service
    const ttsResponse = await fetch(`${ttsApiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: body.text,
        voice: body.voice || 'holly'
      })
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[TTS API] Service error:', {
        status: ttsResponse.status,
        statusText: ttsResponse.statusText,
        error: errorText
      });
      
      return NextResponse.json(
        { 
          error: 'TTS generation failed',
          details: `Service returned ${ttsResponse.status}: ${errorText}`
        },
        { status: ttsResponse.status }
      );
    }

    // Get audio blob from service
    const audioBlob = await ttsResponse.blob();
    
    if (audioBlob.size === 0) {
      console.error('[TTS API] Received empty audio response');
      return NextResponse.json(
        { error: 'Empty audio response from service' },
        { status: 500 }
      );
    }

    console.log('[TTS API] ✅ Successfully generated audio:', {
      size: `${(audioBlob.size / 1024).toFixed(2)} KB`,
      type: audioBlob.type
    });

    // Return audio with proper headers
    return new NextResponse(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBlob.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'attachment; filename="holly_speech.wav"'
      }
    });

  } catch (error) {
    console.error('[TTS API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
