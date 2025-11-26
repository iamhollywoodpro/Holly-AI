/**
 * HOLLY TTS API - Health Check
 */

import { NextResponse } from 'next/server';
import { getTTSHealth } from '@/lib/tts/tts-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = getTTSHealth();
    
    const status: {
      status: 'operational' | 'degraded';
      providers: any;
      primaryProvider: string;
      voice: string;
      timestamp: string;
    } = {
      status: 'operational',
      providers: {
        api: {
          enabled: health.apiEnabled,
          failures: health.apiFailures,
          lastSuccess: health.lastApiSuccess
        },
        selfHosted: {
          enabled: health.selfHostedEnabled,
          failures: health.selfHostedFailures,
          lastSuccess: health.lastSelfHostedSuccess
        }
      },
      primaryProvider: health.primaryProvider,
      voice: health.voice,
      timestamp: new Date().toISOString()
    };
    
    // Determine overall status
    if (health.apiFailures > 5 && !health.selfHostedEnabled) {
      status.status = 'degraded';
    }
    
    return NextResponse.json(status);
    
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
