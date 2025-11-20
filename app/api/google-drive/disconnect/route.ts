// Disconnect Google Drive
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { disconnectDrive } from '@/lib/google-drive/drive-service';
import { logSuccess } from '@/lib/logging/work-log-service';

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
    
    await disconnectDrive(userId);
    
    await logSuccess(userId, 'Google Drive disconnected', {
      metadata: { action: 'disconnect' },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Google Drive disconnected',
    });
    
  } catch (error: any) {
    console.error('Disconnect Drive error:', error);
    
    return NextResponse.json(
      { error: 'Failed to disconnect Google Drive' },
      { status: 500 }
    );
  }
}
