// Revoke Download Link API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { revokeDownloadLink } from '@/lib/downloads/download-link-service';
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
    const { linkId } = body;
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId' },
        { status: 400 }
      );
    }
    
    const success = await revokeDownloadLink(linkId, userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Link not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Log success
    await logSuccess(userId, `Download link revoked: ${linkId}`, {
      metadata: { linkId },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Link revoked successfully',
    });
    
  } catch (error: any) {
    console.error('Revoke download link error:', error);
    
    const { userId } = await auth();
    if (userId) {
      await logError(userId, `Failed to revoke download link: ${error.message}`, {
        metadata: { error: error.message },
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to revoke download link' },
      { status: 500 }
    );
  }
}
