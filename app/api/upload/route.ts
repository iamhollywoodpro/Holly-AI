import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFile } from '@/lib/file-storage';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload a file using Vercel Blob storage
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Determine bucket type based on file type
    let bucketType: 'images' | 'audio' | 'video' | 'documents' | 'general' = 'general';
    if (file.type.startsWith('image/')) bucketType = 'images';
    else if (file.type.startsWith('audio/')) bucketType = 'audio';
    else if (file.type.startsWith('video/')) bucketType = 'video';
    else if (file.type.includes('pdf') || file.type.includes('document')) bucketType = 'documents';

    // Upload using our file-storage helper
    const result = await uploadFile(file, bucketType, {
      userId: user.id,
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      }
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    console.log('[Upload] ✅ File uploaded:', result.url);
    return NextResponse.json({
      success: true,
      file: {
        name: result.fileName,
        url: result.url,
        size: result.fileSize,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
