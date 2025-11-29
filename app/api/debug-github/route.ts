// Debug GitHub Integration
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get GitHub connection details
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: {
        isConnected: true,
        githubUsername: true,
        githubEmail: true,
        publicRepos: true,
        privateRepos: true,
        lastSyncAt: true,
        connectedAt: true,
      }
    });
    
    // Count repos in database
    const repoCount = await prisma.gitHubRepository.count({
      where: { userId: user.id }
    });
    
    // Get sample repos
    const sampleRepos = await prisma.gitHubRepository.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: { githubUpdatedAt: 'desc' },
      select: {
        name: true,
        fullName: true,
        language: true,
        isPrivate: true,
        lastSyncAt: true,
      }
    });
    
    return NextResponse.json({
      debug: 'HOLLY GitHub Integration',
      connection: connection,
      reposInDatabase: repoCount,
      sampleRepos: sampleRepos,
      diagnosis: repoCount === 0 
        ? 'GitHub connected but NO repos in database - auto-sync may have failed during callback'
        : `${repoCount} repos synced successfully`,
      nextSteps: repoCount === 0
        ? 'Try clicking "Sync Repositories" button or reconnect GitHub'
        : 'Repos are synced - check frontend display logic',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
