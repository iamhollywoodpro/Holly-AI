import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * DELETE /api/conversations/cleanup
 * Delete all empty conversations (title contains "New Conversation" and messageCount = 0)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find all empty conversations
    const emptyConversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: 'New Conversation',
            },
            messageCount: 0,
          },
          {
            messageCount: 0,
          }
        ]
      },
      select: {
        id: true,
        title: true,
      }
    });

    console.log(`[Cleanup] Found ${emptyConversations.length} empty conversations for user ${user.id}`);

    // Delete them
    const result = await prisma.conversation.deleteMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: 'New Conversation',
            },
            messageCount: 0,
          },
          {
            messageCount: 0,
          }
        ]
      },
    });

    console.log(`[Cleanup] ✅ Deleted ${result.count} empty conversations`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
      conversations: emptyConversations,
    });
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
