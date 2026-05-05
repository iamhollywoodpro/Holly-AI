// List Google Drive Files
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listFiles } from '@/lib/google-drive/drive-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId') || undefined;
    
    const files = await listFiles(userId, folderId);
    
    return NextResponse.json({
      success: true,
      files,
      count: files.length,
    });
    
  } catch (error: any) {
    console.error('List Drive files error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
