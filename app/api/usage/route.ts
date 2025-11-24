import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// GET /api/usage - Get user's usage statistics
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count conversations this month
    const conversations = await prisma.conversation.count({
      where: {
        userId,
        createdAt: {
          gte: monthStart,
        },
      },
    });

    // Count messages this month
    const messages = await prisma.message.count({
      where: {
        conversation: {
          userId,
        },
        createdAt: {
          gte: monthStart,
        },
      },
    });

    // Estimate tokens (rough approximation: ~4 chars per token)
    const messageContent = await prisma.message.findMany({
      where: {
        conversation: {
          userId,
        },
        createdAt: {
          gte: monthStart,
        },
      },
      select: {
        content: true,
      },
    });

    const totalChars = messageContent.reduce((sum, msg) => sum + msg.content.length, 0);
    const tokens = Math.floor(totalChars / 4);

    return NextResponse.json({
      conversations,
      messages,
      tokens,
    });
  } catch (error) {
    console.error('Failed to fetch usage:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
