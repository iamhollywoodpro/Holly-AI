import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

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

    // Get the track
    const track = await prisma.musicTrack.findUnique({
      where: { id: trackId },
      include: { analyses: true },
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

    // TODO: Implement actual audio analysis
    // For now, we'll create a placeholder analysis
    // In Phase 2, we'll integrate:
    // - Web Audio API for feature extraction
    // - ML models for genre classification
    // - Lyrics transcription (Whisper API)
    // - Hit prediction algorithm

    const analysis = await prisma.musicAnalysis.create({
      data: {
        trackId: track.id,
        userId: userId,
        // Placeholder values - will be replaced with real analysis
        bpm: 120.0,
        key: "C",
        mode: "Major",
        energy: 0.75,
        danceability: 0.8,
        valence: 0.7,
        loudness: -5.0,
        acousticness: 0.2,
        instrumentalness: 0.0,
        speechiness: 0.05,
        primaryGenre: "Pop",
        subGenres: ["Contemporary Pop", "Dance Pop"],
        styleDescriptors: ["Upbeat", "Energetic", "Radio-friendly"],
        hasVocals: true,
        vocalQuality: 0.85,
        vocalRange: "medium",
        productionScore: 8.5,
        mixQuality: 8.0,
        masteringQuality: 8.5,
        hitScore: 7.5,
        marketPotential: "high",
        targetAudience: ["18-35", "Pop enthusiasts", "Radio listeners"],
        similarArtists: ["Artist A", "Artist B"],
        marketPosition: "Commercial mainstream appeal",
        strengths: [
          "Strong melodic hooks",
          "Professional production quality",
          "Clear vocal delivery",
          "Radio-friendly structure",
        ],
        weaknesses: [
          "Could benefit from more dynamic variation",
          "Lyrics could be more distinctive",
        ],
        recommendations: [
          "Consider adding a bridge with instrumental break",
          "Enhance the pre-chorus build-up",
          "Add subtle ad-libs in final chorus",
        ],
        analysisModel: "holly-v1-placeholder",
        confidence: 0.85,
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
      include: {
        analyses: {
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
