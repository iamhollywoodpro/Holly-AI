/**
 * AURA Analysis API - Submit Track for Analysis
 * POST /api/aura/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface AnalyzeRequest {
  trackTitle: string;
  artistName: string;
  genre?: string;
  audioUrl: string;
  lyricsText?: string;
  artworkUrl?: string;
  referenceTrack?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: AnalyzeRequest = await request.json();

    // Validate required fields
    if (!body.trackTitle || !body.artistName || !body.audioUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: trackTitle, artistName, audioUrl' },
        { status: 400 }
      );
    }

    // Create job ID
    const jobId = nanoid();

    // Create music track first
    const track = await prisma.musicTrack.create({
      data: {
        userId,
        trackTitle: body.trackTitle,
        artistName: body.artistName,
        fileName: body.trackTitle + '.mp3',
        fileSize: 0, // Will be updated after analysis
        fileType: 'mp3',
        blobUrl: body.audioUrl,
        duration: 0, // Will be updated after analysis
        status: 'analyzing',
      },
    });

    // Create analysis record
    const analysis = await prisma.musicAnalysis.create({
      data: {
        trackId: track.id,
        userId,
        lyricsTranscript: body.lyricsText,
      },
    });

    // Queue the analysis job
    await queueAnalysisJob(jobId, body);

    // Return job info
    return NextResponse.json({
      jobId,
      trackId: track.id,
      analysisId: analysis.id,
      status: 'pending',
      message: 'Analysis job submitted successfully',
    });

  } catch (error) {
    console.error('[Aura Analyze] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit analysis' },
      { status: 500 }
    );
  }
}

/**
 * Queue analysis job for processing
 */
async function queueAnalysisJob(jobId: string, data: AnalyzeRequest): Promise<void> {
  try {
    // Check if Python worker URL is configured
    const workerUrl = process.env.AURA_WORKER_URL;
    
    if (!workerUrl) {
      // If no worker URL, process inline (for development)
      console.log('[Aura] No AURA_WORKER_URL configured, processing inline...');
      await processAnalysisInline(jobId, data);
      return;
    }

    // Send to Python worker
    const response = await fetch(`${workerUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AURA_WORKER_TOKEN || ''}`,
      },
      body: JSON.stringify({
        jobId,
        audioUrl: data.audioUrl,
        lyricsText: data.lyricsText,
        referenceTrack: data.referenceTrack,
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    console.log(`[Aura] Job ${jobId} queued to worker`);

  } catch (error) {
    console.error('[Aura] Failed to queue job:', error);
    
    // Log error - track status will remain pending
    console.error(`[Aura] Failed to queue job ${jobId}`);
  }
}

/**
 * Process analysis inline (fallback for development)
 */
async function processAnalysisInline(jobId: string, data: AnalyzeRequest): Promise<void> {
  try {
    // Update track status to processing
    const track = await prisma.musicTrack.findFirst({
      where: { blobUrl: data.audioUrl },
    });
    
    if (!track) {
      throw new Error('Track not found');
    }

    await prisma.musicTrack.update({
      where: { id: track.id },
      data: { status: 'analyzing' },
    });

    // Simulate analysis with mock data
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock result
    const mockResult = {
      hit_factor: 78,
      scores: {
        audio: 82,
        lyrics: 75,
        brand: 80,
        market: 76,
      },
      recommendations: [
        {
          type: 'production',
          note: 'Strong production quality. Consider adding more dynamic range in the chorus.',
          priority: 'medium',
        },
        {
          type: 'marketing',
          note: 'High commercial potential! Target playlist curators in the pop/electronic genres.',
          priority: 'high',
        },
      ],
      similar_hits: [
        {
          song: 'Blinding Lights',
          artist: 'The Weeknd',
          year: 2020,
          similarity: 0.78,
        },
        {
          song: 'Levitating',
          artist: 'Dua Lipa',
          year: 2020,
          similarity: 0.72,
        },
      ],
      features: {
        tempo: 120,
        energy: 0.85,
        danceability: 0.78,
      },
      model_version: 'AURA-v2.1-mock',
    };

    // Update analysis with result
    const analysis = await prisma.musicAnalysis.findFirst({
      where: { trackId: track.id },
    });

    if (analysis) {
      await prisma.musicAnalysis.update({
        where: { id: analysis.id },
        data: {
          bpm: mockResult.features.tempo,
          energy: mockResult.features.energy,
          danceability: mockResult.features.danceability,
          hitScore: mockResult.hit_factor / 10,
          productionScore: mockResult.scores.audio / 10,
          marketPotential: mockResult.hit_factor >= 75 ? 'high' : mockResult.hit_factor >= 60 ? 'medium' : 'low',
        },
      });
    }

    // Update track status
    await prisma.musicTrack.update({
      where: { id: track.id },
      data: { status: 'completed' },
    });

    console.log(`[Aura] Job ${jobId} completed (mock)`);

  } catch (error) {
    console.error('[Aura] Inline processing failed:', error);
    
    // Mark track as failed
    const track = await prisma.musicTrack.findFirst({
      where: { blobUrl: data.audioUrl },
    });
    
    if (track) {
      await prisma.musicTrack.update({
        where: { id: track.id },
        data: { status: 'failed' },
      });
    }
  }
}
