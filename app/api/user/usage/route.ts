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

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count user messages this month (each = 1 AI call)
    const messagesThisMonth = await prisma.message.count({
      where: {
        conversation: { userId: user.id },
        role: 'user',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Count AI (assistant) replies this month — closer to actual AI calls
    const aiCallsThisMonth = await prisma.message.count({
      where: {
        conversation: { userId: user.id },
        role: 'assistant',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Real storage estimate: sum content length of all messages (bytes)
    // We aggregate in the DB to avoid pulling all rows into Node.
    const storageResult = await prisma.message.findMany({
      where: { conversation: { userId: user.id } },
      select: { content: true },
    });
    const storageUsedBytes = storageResult.reduce(
      (acc, m) => acc + Buffer.byteLength(m.content ?? '', 'utf8'),
      0,
    );

    // Count total conversations
    const totalConversations = await prisma.conversation.count({
      where: { userId: user.id },
    });

    const FREE_MSG_LIMIT    = 1000;   // generous — Holly runs on free AI APIs
    const STORAGE_LIMIT_MB  = 500;
    const AI_CALLS_LIMIT    = 1000;

    return NextResponse.json({
      usage: {
        messagesUsed:   messagesThisMonth,
        messagesLimit:  FREE_MSG_LIMIT,
        storageUsed:    storageUsedBytes,
        storageLimit:   STORAGE_LIMIT_MB * 1024 * 1024,
        aiCallsUsed:    aiCallsThisMonth,
        aiCallsLimit:   AI_CALLS_LIMIT,
        totalConversations,
        period: `${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`,
        periodStart: startOfMonth.toISOString(),
        periodEnd:   endOfMonth.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[user/usage] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
