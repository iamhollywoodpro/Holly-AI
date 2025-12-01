import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { MusicAnalysisEngine } from "@/lib/music/music-analysis-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for analysis

interface AnalysisRequest {
  trackId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalysisRequest = await req.json();
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    // Get the track with blobUrl
    const track = await prisma.musicTrack.findUnique({
      where: { id: trackId },
      include: { analyses: true },
      select: {
        id: true,
        userId: true,
        artistName: true,
        trackTitle: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        blobUrl: true,
        duration: true,
        status: true,
        uploadedAt: true,
        analyzedAt: true,
        analyses: true,
      },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (track.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update track status
    await prisma.musicTrack.update({
      where: { id: trackId },
      data: { status: "analyzing" },
    });

    // 🎵 HOLLY'S EARS - Professional Music Analysis
    console.log('[Music Analysis] 🎵 Starting HOLLY\'s A&R analysis...');
    
    if (!track.blobUrl) {
      throw new Error('Track has no audio file URL');
    }

    const analysisEngine = new MusicAnalysisEngine();
    const result = await analysisEngine.analyzeTrack(track.blobUrl);

    console.log('[Music Analysis] ✅ Analysis complete:', {
      hitScore: result.hitAnalysis.hitScore,
      bpm: result.technical.bpm,
      key: `${result.technical.key} ${result.technical.mode}`,
      hasLyrics: result.lyrics.hasLyrics
    });

    // Save comprehensive analysis to database
    const analysis = await prisma.musicAnalysis.create({
      data: {
        trackId: track.id,
        userId: userId,
        
        // Technical Analysis
        bpm: result.technical.bpm,
        key: result.technical.key,
        mode: result.technical.mode,
        energy: result.technical.energy,
        danceability: result.technical.danceability,
        valence: result.technical.valence,
        loudness: result.technical.loudness,
        acousticness: result.technical.acousticness,
        instrumentalness: result.technical.instrumentalness,
        speechiness: result.technical.speechiness,
        
        // Genre & Style
        primaryGenre: result.genre.primaryGenre,
        subGenres: result.genre.subGenres,
        styleDescriptors: result.genre.styleDescriptors,
        
        // Vocal Analysis
        hasVocals: result.vocals.hasVocals,
        vocalQuality: result.vocals.vocalQuality / 10, // Convert to 0-1
        vocalRange: result.vocals.vocalRange,
        
        // Production Quality
        productionScore: result.production.productionScore,
        mixQuality: result.production.mixQuality,
        masteringQuality: result.production.masteringQuality,
        
        // Hit Analysis
        hitScore: result.hitAnalysis.hitScore,
        marketPotential: result.billboard.chartPotential.toLowerCase(),
        
        // Billboard Potential
        targetAudience: result.billboard.targetDemographic,
        similarArtists: result.arNotes.comparableArtists,
        marketPosition: result.billboard.marketFit,
        
        // A&R Notes
        strengths: result.arNotes.strengths,
        weaknesses: result.arNotes.weaknesses,
        recommendations: result.arNotes.recommendations,
        
        // Metadata
        analysisModel: result.metadata.analysisModel,
        confidence: result.metadata.confidence,
      },
    });

    // Update track status
    await prisma.musicTrack.update({
      where: { id: trackId },
      data: {
        status: "analyzed",
        analyzedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Music analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze track",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve analysis for a track
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    const track = await prisma.musicTrack.findUnique({
      where: { id: trackId },
      select: {
        id: true,
        userId: true,
        artistName: true,
        trackTitle: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        blobUrl: true,
        duration: true,
        status: true,
        uploadedAt: true,
        analyzedAt: true,
        analyses: {
          select: {
            id: true,
            createdAt: true,
            bpm: true,
            key: true,
            mode: true,
            energy: true,
            hitScore: true,
            billboardPotential: true,
            productionScore: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (track.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      track,
      analysis: track.analyses[0] || null,
    });
  } catch (error) {
    console.error("Retrieve analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
