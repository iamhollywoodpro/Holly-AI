/**
 * AURA A&R Analysis API
 * Analyzes music tracks and provides professional A&R feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for audio analysis

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { audioUrl, audioFile, lyrics, referenceTrack } = body;

    if (!audioUrl && !audioFile) {
      return NextResponse.json(
        { error: 'Either audioUrl or audioFile is required' },
        { status: 400 }
      );
    }

    console.log('[AURA] Starting analysis...');
    console.log('[AURA] Audio URL:', audioUrl);
    console.log('[AURA] Has lyrics:', !!lyrics);

    // For now, return a mock analysis since the Python worker needs to be deployed
    // TODO: Call the Python worker (aura_analyzer.py) when deployed
    const mockAnalysis = {
      hit_factor: 78,
      scores: {
        audio: 82,
        lyrics: 75,
        brand: 78,
        market: 76
      },
      recommendations: [
        {
          type: 'production',
          note: 'Excellent production quality. The mix is well-balanced and professional.',
          priority: 'low'
        },
        {
          type: 'marketing',
          note: 'Strong commercial potential! Consider pitching to major streaming playlists and radio.',
          priority: 'high'
        },
        {
          type: 'arrangement',
          note: 'The tempo and energy level are well-suited for the current market trends.',
          priority: 'medium'
        }
      ],
      similar_hits: [
        {
          song: 'Blinding Lights',
          artist: 'The Weeknd',
          year: 2020,
          similarity: 0.78
        },
        {
          song: 'Levitating',
          artist: 'Dua Lipa',
          year: 2020,
          similarity: 0.72
        },
        {
          song: 'Save Your Tears',
          artist: 'The Weeknd',
          year: 2021,
          similarity: 0.68
        }
      ],
      features: {
        tempo: 118.5,
        spectral_centroid_mean: 2456.7,
        rms_mean: 0.092,
        zcr_mean: 0.045
      },
      model_version: 'AURA-v2.1-mock',
      analyzed_at: new Date().toISOString()
    };

    console.log('[AURA] Analysis complete:', mockAnalysis.hit_factor);

    return NextResponse.json({
      success: true,
      analysis: mockAnalysis
    });

  } catch (error) {
    console.error('[AURA] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      },
      { status: 500 }
    );
  }
}
