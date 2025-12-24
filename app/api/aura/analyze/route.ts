import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST(req: NextRequest) {
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

    // Parse JSON body (files already uploaded client-side)
    const body = await req.json();
    
    const { 
      trackTitle, 
      artistName, 
      genre, 
      audioUrl, 
      lyricsText, 
      artworkUrl, 
      referenceTrack 
    } = body;

    // Validate required fields
    if (!trackTitle || !artistName || !audioUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: trackTitle, artistName, audioUrl' },
        { status: 400 }
      );
    }

    // Generate unique job ID
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const jobId = `aura_${timestamp}_${randomString}`;

    // Create analysis job in database
    const analysis = await prisma.auraAnalysis.create({
      data: {
        userId: user.id,
        jobId,
        status: 'queued',
        progress: 0,
        trackTitle,
        artistName,
        genre,
        audioUrl,
        lyricsText,
        artworkUrl,
        referenceTrack,
      },
    });

    // Job will be picked up by polling worker

    return NextResponse.json({
      jobId: analysis.jobId,
      status: analysis.status,
      message: 'Analysis job created successfully',
    });

  } catch (error) {
    console.error('Error creating analysis job:', error);
    return NextResponse.json(
      { error: 'Failed to create analysis job' },
      { status: 500 }
    );
  }
}
