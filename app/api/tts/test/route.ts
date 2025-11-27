/**
 * TTS Test Endpoint - Verify Maya1 integration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const ttsApiUrl = process.env.TTS_API_URL || process.env.NEXT_PUBLIC_TTS_API_URL;

    if (!ttsApiUrl) {
      return NextResponse.json({
        success: false,
        error: 'TTS_API_URL not configured',
        message: 'Please set TTS_API_URL environment variable in Vercel',
      }, { status: 500 });
    }

    // Test health endpoint
    console.log('[TTS Test] Checking health:', ttsApiUrl);
    const healthResponse = await fetch(`${ttsApiUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!healthResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'TTS API health check failed',
        status: healthResponse.status,
        url: ttsApiUrl,
      }, { status: 500 });
    }

    const healthData = await healthResponse.json();

    // Test voice info endpoint
    const voiceInfoResponse = await fetch(`${ttsApiUrl}/voice/info`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const voiceInfo = voiceInfoResponse.ok ? await voiceInfoResponse.json() : null;

    return NextResponse.json({
      success: true,
      message: 'TTS API is operational',
      api_url: ttsApiUrl,
      health: healthData,
      voice_info: voiceInfo,
      endpoints: {
        health: `${ttsApiUrl}/health`,
        generate: `${ttsApiUrl}/generate`,
        voice_info: `${ttsApiUrl}/voice/info`,
      },
    });

  } catch (error) {
    console.error('[TTS Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'TTS test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Missing text parameter',
      }, { status: 400 });
    }

    const ttsApiUrl = process.env.TTS_API_URL || process.env.NEXT_PUBLIC_TTS_API_URL;

    if (!ttsApiUrl) {
      return NextResponse.json({
        success: false,
        error: 'TTS_API_URL not configured',
      }, { status: 500 });
    }

    console.log('[TTS Test] Generating speech:', text);

    const response = await fetch(`${ttsApiUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'TTS generation failed',
        status: response.status,
        statusText: response.statusText,
      }, { status: response.status });
    }

    // Return audio
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename=test_speech.wav',
        'X-TTS-Provider': 'Maya1',
      },
    });

  } catch (error) {
    console.error('[TTS Test] Generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'TTS generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
