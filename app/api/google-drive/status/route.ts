// Check Google Drive Connection Status
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    const connection = await prisma.googleDriveConnection.findUnique({
      where: { userId },
      select: {
        isConnected: true,
        googleEmail: true,
        googleName: true,
        googlePicture: true,
        lastSyncAt: true,
        autoUpload: true,
        syncEnabled: true,
        quotaUsed: true,
        quotaLimit: true,
      },
    });
    
    if (!connection) {
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }
    
    return NextResponse.json({
      success: true,
      connected: connection.isConnected,
      user: {
        email: connection.googleEmail,
        name: connection.googleName,
        picture: connection.googlePicture,
      },
      settings: {
        autoUpload: connection.autoUpload,
        syncEnabled: connection.syncEnabled,
      },
      quota: {
        used: connection.quotaUsed.toString(),
        limit: connection.quotaLimit?.toString(),
      },
      lastSyncAt: connection.lastSyncAt,
    });
    
  } catch (error: any) {
    console.error('Check Drive status error:', error);
    
    return NextResponse.json(
      { error: 'Failed to check Drive status' },
      { status: 500 }
    );
  }
}
