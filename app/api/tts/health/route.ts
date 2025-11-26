// app/api/tts/health/route.ts
// HOLLY TTS Health Check - Proxy to Self-Hosted Service
// Created for Steve "Hollywood" Dorego

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get TTS service URL from environment
    const ttsApiUrl = process.env.TTS_API_URL || process.env.NEXT_PUBLIC_TTS_API_URL;
    
    if (!ttsApiUrl) {
      return NextResponse.json(
        { 
          status: 'unhealthy',
          error: 'TTS_API_URL not configured',
          service: 'HOLLY TTS',
          ready: false
        },
        { status: 503 }
      );
    }

    console.log('[TTS Health] Checking service:', ttsApiUrl);

    // Check self-hosted service health
    const healthResponse = await fetch(`${ttsApiUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!healthResponse.ok) {
      console.error('[TTS Health] Service unhealthy:', {
        status: healthResponse.status,
        statusText: healthResponse.statusText
      });
      
      return NextResponse.json(
        { 
          status: 'unhealthy',
          error: `Service returned ${healthResponse.status}`,
          service: 'HOLLY TTS',
          ready: false
        },
        { status: healthResponse.status }
      );
    }

    const healthData = await healthResponse.json();
    
    console.log('[TTS Health] ✅ Service healthy:', healthData);

    return NextResponse.json(healthData, { status: 200 });

  } catch (error) {
    console.error('[TTS Health] Error:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'HOLLY TTS',
        ready: false
      },
      { status: 500 }
    );
  }
}
