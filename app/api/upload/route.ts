import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/file-storage';
import { getAuthUser } from '@/lib/auth/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/upload
 * Handles file uploads from chat interface
 * Stores files in Supabase Storage and returns public URLs
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    console.log('[Upload] Uploading file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      userId: user?.id || 'anonymous',
      conversationId: conversationId || 'none'
    });

    // Upload file
    const result = await uploadFile(
      file,
      user?.id,
      conversationId || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    console.log('[Upload] File uploaded successfully:', result.publicUrl);

    return NextResponse.json({
      success: true,
      url: result.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (error) {
    console.error('[Upload] Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/upload',
    method: 'POST',
    description: 'Upload files to HOLLY storage',
    contentType: 'multipart/form-data',
    parameters: {
      file: {
        required: true,
        type: 'File',
        description: 'The file to upload'
      },
      conversationId: {
        required: false,
        type: 'string',
        description: 'Optional conversation ID to associate file with'
      }
    },
    limits: {
      maxFileSize: '50MB',
      supportedTypes: 'Audio, Video, Images, Code, Documents, Data files'
    },
    response: {
      success: true,
      url: 'https://storage.example.com/path/to/file.ext',
      fileName: 'example.pdf',
      fileSize: 1024000,
      fileType: 'application/pdf'
    }
  });
}
