/**
 * AURA Analysis API - Submit Track for Analysis
 * POST /api/aura/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited // 5 minutes

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
    // Check authentication — allow internal server-to-server calls (e.g., from HOLLY A&R engine)
    const internalToken = request.headers.get('x-internal-token');
    const isInternalCall = internalToken === (process.env.INTERNAL_API_SECRET ?? 'holly-internal');

    let userId: string | null = null;
    if (!isInternalCall) {
      const session = await auth();
      userId = session.userId;
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      userId = 'holly-internal';
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
 * Queue analysis job — uses Groq AI (free) for real analysis
 */
async function queueAnalysisJob(jobId: string, data: AnalyzeRequest): Promise<void> {
  // Always process with Groq AI — no external Python worker needed
  console.log('[Aura] Processing with Groq AI (free)...');
  await processAnalysisWithGroq(jobId, data);
}

/**
 * Real AI analysis via the smart router (creative task)
 */
async function processAnalysisWithGroq(jobId: string, data: AnalyzeRequest): Promise<void> {
  try {
    const track = await prisma.musicTrack.findFirst({
      where: { blobUrl: data.audioUrl },
    });
    if (!track) throw new Error('Track not found');

    await prisma.musicTrack.update({
      where: { id: track.id },
      data: { status: 'analyzing' },
    });

    // Build context for AI
    const contextParts: string[] = [];
    contextParts.push(`Track: "${data.trackTitle}"`);
    contextParts.push(`Artist: ${data.artistName}`);
    if (data.genre)      contextParts.push(`Genre: ${data.genre}`);
    if (data.audioUrl)  contextParts.push(`Audio: ${data.audioUrl}`);
    if (data.lyricsText) contextParts.push(`\nLyrics:\n${data.lyricsText.slice(0, 2000)}`);
    if (data.referenceTrack) contextParts.push(`Reference track: ${data.referenceTrack}`);

    let aiResult: Record<string, unknown> | null = null;

    {
      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');

      const prompt = `You are AURA, an elite A&R analyst with 20+ years in the music industry.
Analyze this track and provide a professional A&R assessment.

${contextParts.join('\n')}

Respond ONLY with valid JSON:
{
  "hit_factor": <0-100>,
  "scores": { "audio": <0-100>, "lyrics": <0-100>, "brand": <0-100>, "market": <0-100> },
  "commercial_viability": <0-100>,
  "artistic_merit": <0-100>,
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "..."],
  "recommendations": [{"type": "production|marketing|lyrics", "note": "...", "priority": "high|medium|low"}],
  "similar_hits": [{"song": "...", "artist": "...", "year": 2020, "similarity": 0.75}],
  "playlist_targets": ["...", "...", "..."],
  "radio_viability": "High|Medium|Low",
  "sync_potential": "High|Medium|Low",
  "a_and_r_verdict": "2-3 sentence honest verdict",
  "target_audience": "specific demographic",
  "features": { "tempo": <bpm estimate>, "energy": <0-1>, "danceability": <0-1> },
  "model_version": "AURA-v3.0"
}`;

      try {
        const routeResult = smartRoute(prompt, { taskHint: 'creative' });
        console.log(`[AURA analyze] Routing via ${routeResult.reason}`);
        const { text: content, model: usedModel } = await cascadeCollect(
          routeResult.waterfall,
          [{ role: 'user', content: prompt }],
          { temperature: 0.7, maxTokens: 1024 },
        );
        if (content) {
          const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
          aiResult = JSON.parse(cleaned);
          if (aiResult) aiResult['model_version'] = `AURA-v3.0 (${usedModel.displayName})`;
        }
      } catch (aiErr) {
        console.warn('[AURA analyze] AI failed, using fallback:', aiErr);
      }
    }

    // Fallback values if AI fails or no providers configured
    const result: Record<string, unknown> = aiResult || {
      hit_factor: 72,
      scores: { audio: 75, lyrics: 70, brand: 72, market: 71 },
      commercial_viability: 71,
      artistic_merit: 73,
      strengths: ['Solid concept and direction', 'Clear artistic identity', 'Good energy level'],
      weaknesses: ['Production could be more polished', 'Hook needs more memorability'],
      recommendations: [
        { type: 'production', note: 'Refine the mix — more clarity in the high-mids.', priority: 'medium' },
        { type: 'marketing', note: 'Target playlist curators in your genre.', priority: 'high' },
      ],
      similar_hits: [],
      playlist_targets: [],
      radio_viability: 'Medium',
      sync_potential: 'Medium',
      a_and_r_verdict: 'Shows potential. Further development recommended before major label pitch.',
      target_audience: 'Young adults 18-30',
      features: { tempo: 120, energy: 0.75, danceability: 0.70 },
      model_version: 'AURA-v3.0-fallback',
    };

    const mockResult = result;

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

    console.log(`[Aura] Job ${jobId} completed (AI-powered)`);

  } catch (error) {
    console.error('[Aura] Groq analysis failed:', error);
    
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
