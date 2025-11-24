import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database user
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch stats with graceful error handling
    const results = await Promise.allSettled([
      prisma.conversation.count({ where: { userId: user.id } }),
      prisma.message.count({ where: { conversation: { userId: user.id } } }),
      prisma.gitHubConnection.findUnique({ where: { userId: user.id }, select: { publicRepos: true, privateRepos: true } }),
      prisma.googleDriveConnection.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);

    // Extract values with fallbacks
    const conversationsCount = results[0].status === 'fulfilled' ? results[0].value : 0;
    const messagesCount = results[1].status === 'fulfilled' ? results[1].value : 0;
    const githubConnection = results[2].status === 'fulfilled' ? results[2].value : null;
    const driveConnection = results[3].status === 'fulfilled' ? results[3].value : null;

    // Get last active conversation
    const lastConversation = await prisma.conversation.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const stats = {
      totalConversations: conversationsCount,
      totalMessages: messagesCount,
      activeRepos: (githubConnection?.publicRepos || 0) + (githubConnection?.privateRepos || 0),
      driveFilesCount: driveConnection ? 0 : 0, // TODO: Implement Drive file counting
      lastActiveAt: lastConversation?.updatedAt.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
