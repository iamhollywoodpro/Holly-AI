// API Route: Get GitHub Connection Info
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json({ connected: false }, { status: 404 });
    }
    
    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: {
        isConnected: true,
        githubUsername: true,
      },
    });
    
    if (!connection || !connection.isConnected) {
      return NextResponse.json({ connected: false });
    }
    
    // Count repositories
    const repoCount = await prisma.gitHubRepository.count({
      where: { userId: user.id },
    });
    
    return NextResponse.json({
      connected: true,
      username: connection.githubUsername,
      repoCount,
    });
    
  } catch (error: any) {
    console.error('Get GitHub connection error:', error);
    return NextResponse.json(
      { connected: false, error: 'Failed to get connection info' },
      { status: 500 }
    );
  }
}
