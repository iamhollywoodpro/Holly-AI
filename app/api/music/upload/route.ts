import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';


/**
 * POST /api/music/upload
 * Upload audio file for A&R analysis
 * 
 * Accepts: multipart/form-data with audio file
 * Returns: Upload metadata with blob URL
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const artistName = formData.get('artistName') as string || 'Unknown Artist';
    const trackTitle = formData.get('trackTitle') as string || 'Untitled';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|flac)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: MP3, WAV, M4A, FLAC' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 50MB' },
        { status: 400 }
      );
    }

    console.log('[Music Upload] Uploading:', {
      name: file.name,
      type: file.type,
      size: file.size,
      artist: artistName,
      title: trackTitle,
    });

    // Upload to Vercel Blob
    const blob = await put(`music/${user.id}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log('[Music Upload] Uploaded to blob:', blob.url);

    // Save to database
    const musicTrack = await prisma.musicTrack.create({
      data: {
        userId: user.id,
        artistName,
        trackTitle,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        blobUrl: blob.url,
        uploadedAt: new Date(),
        status: 'uploaded',
      },
    });

    console.log('[Music Upload] Saved to database:', musicTrack.id);

    return NextResponse.json({
      success: true,
      track: {
        id: musicTrack.id,
        artistName: musicTrack.artistName,
        trackTitle: musicTrack.trackTitle,
        fileName: musicTrack.fileName,
        fileSize: musicTrack.fileSize,
        blobUrl: musicTrack.blobUrl,
        uploadedAt: musicTrack.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error('[Music Upload] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to upload music file' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/music/upload
 * List uploaded music tracks for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tracks = await prisma.musicTrack.findMany({
      where: { userId: user.id },
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      tracks,
      count: tracks.length,
    });
  } catch (error: any) {
    console.error('[Music Upload] Error fetching tracks:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}
