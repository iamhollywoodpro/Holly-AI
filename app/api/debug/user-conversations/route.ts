// Debug endpoint to check user and conversations
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find all users with this clerkId or email
    const userByClerkId = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        conversations: {
          select: {
            id: true,
            title: true,
            messageCount: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    // Also search for any users that might have been created
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    return NextResponse.json({
      currentClerkId: clerkUserId,
      userByClerkId: userByClerkId ? {
        id: userByClerkId.id,
        clerkId: userByClerkId.clerkId,
        email: userByClerkId.email,
        conversationCount: userByClerkId.conversations.length,
        conversations: userByClerkId.conversations,
      } : null,
      allUsers,
      summary: {
        totalUsers: allUsers.length,
        usersWithConversations: allUsers.filter(u => u._count.conversations > 0).length,
        totalConversationsAcrossAllUsers: allUsers.reduce((sum, u) => sum + u._count.conversations, 0),
      },
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
