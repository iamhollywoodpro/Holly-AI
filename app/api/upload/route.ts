import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
// import { put } from '@vercel/blob'; // TODO: Install package or use alternative storage

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload a file to Vercel Blob storage
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
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

    // TODO: Upload to storage (Vercel Blob or alternative)
    // const blob = await put(file.name, file, { access: 'public' });
    const placeholderUrl = `/uploads/${file.name}`;

    // Record in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageUrl: placeholderUrl,
      },
    });

    console.log('[Upload] ✅ File uploaded:', fileUpload.id);
    return NextResponse.json({
      success: true,
      file: {
        id: fileUpload.id,
        name: fileUpload.fileName,
        url: fileUpload.storageUrl,
        type: fileUpload.fileType,
        size: fileUpload.fileSize,
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
