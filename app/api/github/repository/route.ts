import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getRepository } from '@/lib/github-api';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 403 }
      );
    }

    // Fetch repository details
    const repository = await getRepository(owner, repo, connection.accessToken);

    return NextResponse.json({ repository });

  } catch (error: any) {
    console.error('Repository API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repository' },
      { status: 500 }
    );
  }
}
