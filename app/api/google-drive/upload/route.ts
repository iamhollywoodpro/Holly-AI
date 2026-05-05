// Upload File to Google Drive
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFile } from '@/lib/google-drive/drive-service';
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
    
    if (!body.fileName || !body.fileUrl) {
      return NextResponse.json(
        { error: 'Missing fileName or fileUrl' },
        { status: 400 }
      );
    }
    
    // Download file from URL
    const fileResponse = await fetch(body.fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file');
    }
    
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    
    // Upload to Drive
    const result = await uploadFile(userId, {
      fileName: body.fileName,
      mimeType: body.mimeType || 'application/octet-stream',
      fileBuffer,
      folderId: body.folderId,
      description: body.description,
    });
    
    await logSuccess(userId, `File uploaded to Drive: ${body.fileName}`, {
      conversationId: body.conversationId,
      metadata: {
        fileId: result.fileId,
        fileName: body.fileName,
      },
    });
    
    return NextResponse.json({
      success: true,
      file: result,
    });
    
  } catch (error: any) {
    console.error('Upload to Drive error:', error);
    
    const { userId } = await auth();
    if (userId) {
      await logError(userId, `Drive upload failed: ${error.message}`, {
        metadata: { error: error.message },
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to upload to Drive' },
      { status: 500 }
    );
  }
}
