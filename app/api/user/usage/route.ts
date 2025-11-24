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

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count messages this month
    const messagesThisMonth = await prisma.message.count({
      where: {
        conversation: { userId: user.id },
        role: 'user', // Only count user messages
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // TODO: Implement actual storage calculation
    const storageUsed = 0; // Placeholder

    // TODO: Implement actual AI calls tracking
    const aiCallsUsed = messagesThisMonth; // Rough estimate

    const usage = {
      messagesUsed: messagesThisMonth,
      messagesLimit: 100, // Free tier limit
      storageUsed: storageUsed,
      storageLimit: 500 * 1024 * 1024, // 500 MB in bytes
      aiCallsUsed: aiCallsUsed,
      aiCallsLimit: 100,
      period: `${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`,
    };

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Failed to fetch usage stats:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
