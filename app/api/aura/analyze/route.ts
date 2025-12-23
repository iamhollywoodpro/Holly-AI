import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/file-storage';

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

    // Parse form data
    const formData = await req.formData();
    
    const trackTitle = formData.get('trackTitle') as string;
    const artistName = formData.get('artistName') as string;
    const genre = formData.get('genre') as string | null;
    const audioFile = formData.get('audioFile') as File;
    const lyricsText = formData.get('lyricsText') as string | null;
    const artworkFile = formData.get('artworkFile') as File | null;
    const referenceTrack = formData.get('referenceTrack') as string | null;

    // Validate required fields
    if (!trackTitle || !artistName || !audioFile) {
      return NextResponse.json(
        { error: 'Missing required fields: trackTitle, artistName, audioFile' },
        { status: 400 }
      );
    }

    // Generate unique job ID
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const jobId = `aura_${timestamp}_${randomString}`;

    // Upload audio file to Vercel Blob
    const audioUploadResult = await uploadFile(audioFile, 'audio', {
      userId: user.id,
      metadata: { jobId, trackTitle, artistName }
    });

    if (!audioUploadResult.success || !audioUploadResult.url) {
      return NextResponse.json(
        { error: 'Failed to upload audio file' },
        { status: 500 }
      );
    }

    const audioUrl = audioUploadResult.url;

    // Upload artwork if provided
    let artworkUrl: string | null = null;
    if (artworkFile) {
      const artworkUploadResult = await uploadFile(artworkFile, 'images', {
        userId: user.id,
        metadata: { jobId, trackTitle, artistName }
      });
      
      if (artworkUploadResult.success && artworkUploadResult.url) {
        artworkUrl = artworkUploadResult.url;
      }
    }

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
