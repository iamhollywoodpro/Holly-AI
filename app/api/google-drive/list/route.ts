/**
 * POST /api/google-drive/list
 * Lists files from the user's Google Drive (HOLLY AI folder).
 * Delegates to the real drive-service which handles OAuth2 + token refresh.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { listFiles } from '@/lib/google-drive/drive-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve DB user ID
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { folderId } = body; // optional — omit to list HOLLY AI root folder

    const files = await listFiles(user.id, folderId);

    return NextResponse.json({
      success: true,
      files,
      totalFiles: files.length,
      nextPageToken: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const notConnected = error.message?.includes('not connected');
    console.error('[DriveList]', error.message);
    return NextResponse.json(
      { success: false, error: notConnected ? 'Google Drive not connected' : error.message },
      { status: notConnected ? 403 : 500 },
    );
  }
}
