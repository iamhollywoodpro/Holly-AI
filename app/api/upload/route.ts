import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFile } from '@/lib/file-storage';
import { prisma } from '@/lib/db';
import { MultiModelVision } from '@/lib/vision/multi-model-vision';

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

    // 🔹 AUTO-VISION PROCESSING - Give HOLLY eyes!
    let visionAnalysis = null;
    if (file.type.startsWith('image/')) {
      try {
        console.log('[Upload] 👁️  Processing image with vision...');
        const vision = new MultiModelVision();
        
        // Use fast BLIP for initial caption, optionally add GPT-4 for detailed analysis
        const analysis = await vision.analyzeImage(result.url, {
          taskType: 'general',
          useMultipleModels: false // Set to true for more detailed analysis
        });
        
        visionAnalysis = {
          description: analysis.combined,
          summary: analysis.structured.summary,
          keyElements: analysis.structured.keyElements,
          model: analysis.primary.model,
          processingTime: analysis.primary.processingTime
        };
        
        console.log('[Upload] ✅ Vision analysis complete:', visionAnalysis.summary);
      } catch (visionError) {
        console.error('[Upload] ⚠️  Vision processing failed:', visionError);
        // Continue without vision - don't fail the upload
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        name: result.fileName,
        url: result.url,
        size: result.fileSize,
      },
      vision: visionAnalysis // Include vision analysis if available
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
