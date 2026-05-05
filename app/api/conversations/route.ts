import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Conversations API] GET request started');

    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (e) {
      console.log('[Conversations API] Auth failed, bypassing if in dev mode.');
    }

    if (!userId && process.env.NODE_ENV === 'development') {
      userId = 'local-dev-user';
    }

    console.log('[Conversations API] Clerk userId:', userId || 'NONE');

    if (!userId) {
      console.error('[Conversations API] No Clerk userId - unauthorized');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user with REAL email from Clerk
    console.log('[Conversations API] Getting/creating user with real email...');
    const user = await getOrCreateUser(userId);
    console.log('[Conversations API] User result:', `User ${user.id} (${user.email})`);

    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const rawLimit = parseInt(searchParams.get('limit') || '30', 10);
    const direction = searchParams.get('direction') || 'before';

    const isPaginated = !!cursor;
    const limit = Math.min(Math.max(rawLimit || 30, 1), 100);

    const whereClause: Record<string, unknown> = { userId: user.id };

    if (cursor) {
      if (direction === 'after') {
        whereClause.id = { gt: cursor };
      } else {
        whereClause.id = { lt: cursor };
      }
    }

    const fetchLimit = isPaginated ? limit + 1 : limit;

    console.log('[Conversations API] Fetching conversations for user:', user.id,
      isPaginated ? `| cursor: ${cursor}, direction: ${direction}, limit: ${limit}` : '| no pagination');

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: fetchLimit,
      select: {
        id: true,
        title: true,
        messageCount: true,
        lastMessagePreview: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let hasMore = false;
    let nextCursor: string | null = null;

    if (isPaginated && conversations.length > limit) {
      hasMore = true;
      conversations.pop();
    }

    if (conversations.length > 0) {
      nextCursor = conversations[conversations.length - 1].id;
    }

    console.log('[Conversations API] ✅ Found', conversations.length, 'conversations',
      isPaginated ? `| hasMore: ${hasMore}` : '');

    if (isPaginated) {
      return NextResponse.json({ conversations, hasMore, nextCursor });
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[Conversations API] GET error:', error);
    return NextResponse.json({ conversations: [] });
  }
}

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Conversations API POST] Starting conversation creation...');
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (e) {
      console.log('[Conversations API POST] Auth failed, bypassing if in dev mode.');
    }

    if (!userId && process.env.NODE_ENV === 'development') {
      userId = 'local-dev-user';
    }

    console.log('[Conversations API POST] Clerk userId:', userId || 'NONE');

    if (!userId) {
      console.error('[Conversations API POST] No userId - unauthorized');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user with REAL email from Clerk
    console.log('[Conversations API POST] Calling getOrCreateUser...');
    const user = await getOrCreateUser(userId);
    console.log('[Conversations API POST] User retrieved:', user.id);

    const { title, firstMessage } = await request.json();

    // Generate title from first message if not provided
    let conversationTitle = title || 'New Conversation';
    if (!title && firstMessage) {
      conversationTitle = generateTitleFromMessage(firstMessage);
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: conversationTitle,
        messageCount: 0,
      },
    });

    console.log('[Conversations] ✅ Created conversation:', conversation.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('[Conversations API] POST error:', error);
    return NextResponse.json({ conversation: null });
  }
}

/**
 * Generate a conversation title from the first message
 */
function generateTitleFromMessage(message: string): string {
  // Clean the message
  let cleaned = message.trim();

  // Remove markdown
  cleaned = cleaned.replace(/[*_`#]/g, '');

  // Take first 50 characters
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + '...';
  }

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return cleaned || 'New Conversation';
}

/**
 * DELETE /api/conversations?id=xxx
 * Delete a conversation and all its messages
 */
export async function DELETE(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (e) {
      console.log('[Conversations API DELETE] Auth failed, bypassing if in dev mode.');
    }

    if (!userId && process.env.NODE_ENV === 'development') {
      userId = 'local-dev-user';
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Delete conversation (messages will cascade delete)
    await prisma.conversation.delete({
      where: {
        id: conversationId,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Conversations API] DELETE error:', error);
    return NextResponse.json({ success: false });
  }
}
