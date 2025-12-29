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

    // Handle both JSON and FormData
    const contentType = req.headers.get('content-type') || '';
    let audioUrl, audioFile, lyrics, referenceTrack;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      audioUrl = formData.get('audioUrl') as string;
      audioFile = formData.get('file') as File;
      lyrics = formData.get('lyrics') as string;
      referenceTrack = formData.get('referenceTrack') as string;
    } else {
      const body = await req.json();
      ({ audioUrl, audioFile, lyrics, referenceTrack } = body);
    }

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
      overall_score: 78,
      production_quality: 82,
      commercial_viability: 76,
      artistic_merit: 75,
      strengths: [
        'Excellent production quality with professional mix',
        'Strong commercial appeal and market potential',
        'Well-balanced tempo and energy levels'
      ],
      weaknesses: [
        'Could benefit from more dynamic variation',
        'Lyrics could be more developed'
      ],
      recommendations: [
        'Consider pitching to major streaming playlists',
        'Target radio stations in the pop/electronic genre',
        'Develop a strong visual identity for marketing'
      ],
      market_potential: 'High - Strong commercial appeal with mainstream potential',
      target_audience: 'Ages 18-35, fans of electronic pop and dance music',
      genre_fit: 'Electronic Pop / Dance',
      model_version: 'AURA-v2.1-mock',
      analyzed_at: new Date().toISOString()
    };

    console.log('[AURA] Analysis complete:', mockAnalysis.overall_score);

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
