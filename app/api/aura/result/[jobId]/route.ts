import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { jobId } = params;

    // Fetch analysis from database
    const analysis = await prisma.auraAnalysis.findFirst({
      where: {
        jobId,
        userId: user.id,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Check if analysis is complete
    if (analysis.status !== 'completed') {
      return NextResponse.json(
        { error: 'Analysis not yet complete', status: analysis.status },
        { status: 409 }
      );
    }

    // Parse JSON fields
    const recommendations = analysis.recommendations as any[] || [];
    const similarHits = analysis.similarHits as any[] || [];
    const fullReport = analysis.fullReport as any || {};

    // Build result object
    const result = {
      jobId: analysis.jobId,
      status: analysis.status,
      
      // Track info
      trackTitle: analysis.trackTitle,
      artistName: analysis.artistName,
      genre: analysis.genre,
      audioUrl: analysis.audioUrl,
      artworkUrl: analysis.artworkUrl,
      
      // Scores
      hitFactor: analysis.hitFactor || 0,
      scores: {
        overall: analysis.hitFactor || 0,
        audio: analysis.audioScore || 0,
        lyrics: analysis.lyricsScore || 0,
        brand: analysis.brandScore || 0,
        market: analysis.marketScore || 0,
      },
      
      // Results
      recommendations,
      similarHits,
      
      // Metadata
      modelVersion: analysis.modelVersion || 'AURA-v2.1',
      processingTime: analysis.processingTime || 0,
      completedAt: analysis.completedAt || analysis.updatedAt,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching analysis result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis result' },
      { status: 500 }
    );
  }
}
