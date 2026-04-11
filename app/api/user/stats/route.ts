import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { listFiles } from '@/lib/google-drive/drive-service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch core stats in parallel; Drive file count is best-effort
    const [statsResults, driveFilesResult] = await Promise.allSettled([
      Promise.allSettled([
        prisma.conversation.count({ where: { userId: user.id } }),
        prisma.message.count({ where: { conversation: { userId: user.id } } }),
        prisma.gitHubConnection.findUnique({ where: { userId: user.id }, select: { publicRepos: true, privateRepos: true } }),
        prisma.googleDriveConnection.findUnique({ where: { userId: user.id }, select: { id: true, isConnected: true } }),
        prisma.conversation.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]),
      // Drive file count — call the real Drive API; silently returns 0 on any error
      (async () => {
        try {
          const driveConn = await prisma.googleDriveConnection.findUnique({
            where: { userId: user.id },
            select: { isConnected: true },
          });
          if (!driveConn?.isConnected) return 0;
          const files = await listFiles(user.id);
          return files.length;
        } catch {
          return 0;
        }
      })(),
    ]);

    // Extract core stats
    const coreResults = statsResults.status === 'fulfilled' ? statsResults.value : [];
    const conversationsCount = coreResults[0]?.status === 'fulfilled' ? coreResults[0].value : 0;
    const messagesCount      = coreResults[1]?.status === 'fulfilled' ? coreResults[1].value : 0;
    const githubConnection   = coreResults[2]?.status === 'fulfilled' ? coreResults[2].value : null;
    const lastConversation   = coreResults[4]?.status === 'fulfilled' ? coreResults[4].value : null;

    // Drive file count from real API call
    const driveFilesCount = driveFilesResult.status === 'fulfilled' ? driveFilesResult.value : 0;

    const stats = {
      totalConversations: conversationsCount as number,
      totalMessages:      messagesCount as number,
      activeRepos: ((githubConnection as any)?.publicRepos || 0) + ((githubConnection as any)?.privateRepos || 0),
      driveFilesCount,
      lastActiveAt: (lastConversation as any)?.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
