// List User's Download Links API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserDownloadLinks } from '@/lib/downloads/download-link-service';

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
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const links = await getUserDownloadLinks(userId, limit);
    
    return NextResponse.json({
      success: true,
      links,
      count: links.length,
    });
    
  } catch (error: any) {
    console.error('List download links error:', error);
    
    return NextResponse.json(
      { error: 'Failed to list download links' },
      { status: 500 }
    );
  }
}
