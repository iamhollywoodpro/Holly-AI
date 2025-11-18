// Create Download Link API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createDownloadLink, CreateDownloadLinkOptions } from '@/lib/downloads/download-link-service';
import { logSuccess, logError } from '@/lib/logging/work-log-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.fileName || !body.fileType || !body.fileSize || !body.storagePath || !body.mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const options: CreateDownloadLinkOptions = {
      userId,
      conversationId: body.conversationId,
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
      storagePath: body.storagePath,
      mimeType: body.mimeType,
      password: body.password,
      expiration: body.expiration || '7days',
      maxDownloads: body.maxDownloads,
      title: body.title,
      description: body.description,
      tags: body.tags,
      metadata: body.metadata,
      generatedBy: body.generatedBy,
      generationTime: body.generationTime,
    };
    
    const link = await createDownloadLink(options);
    
    // Log success
    await logSuccess(userId, `Download link created: ${link.fileName}`, {
      conversationId: body.conversationId,
      metadata: {
        linkId: link.linkId,
        fileType: link.fileType,
        expiresAt: link.expiresAt?.toISOString(),
      },
    });
    
    return NextResponse.json({
      success: true,
      link,
    });
    
  } catch (error: any) {
    console.error('Create download link error:', error);
    
    const { userId } = await auth();
    if (userId) {
      await logError(userId, `Failed to create download link: ${error.message}`, {
        metadata: { error: error.message },
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create download link' },
      { status: 500 }
    );
  }
}
