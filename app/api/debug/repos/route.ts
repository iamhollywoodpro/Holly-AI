// Debug API: Check GitHub Repositories in Database
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get all repositories
    const repos = await prisma.gitHubRepository.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        fullName: true,
        owner: true,
        language: true,
        isPrivate: true,
        githubUpdatedAt: true,
        lastSyncAt: true,
      },
      orderBy: { githubUpdatedAt: 'desc' },
    });
    
    return NextResponse.json({
      success: true,
      count: repos.length,
      repos,
    });
    
  } catch (error: any) {
    console.error('Debug repos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repos', details: error.message },
      { status: 500 }
    );
  }
}
