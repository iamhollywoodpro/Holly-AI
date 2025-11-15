import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Conversations API] GET request started');
    
    const { userId } = await auth();
    console.log('[Conversations API] Clerk userId:', userId || 'NONE');
    
    if (!userId) {
      console.error('[Conversations API] No Clerk userId - unauthorized');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user in database
    console.log('[Conversations API] Upserting user...');
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: '', // Will be updated by webhook
      },
    });
    console.log('[Conversations API] User result:', `User ${user.id}`);

    console.log('[Conversations API] Fetching conversations for user:', user.id);
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        messageCount: true,
        lastMessagePreview: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('[Conversations API] ✅ Found', conversations.length, 'conversations');
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[Conversations API] ❌ CRITICAL ERROR:');
    console.error('[Conversations API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[Conversations API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Conversations API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user in database
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: '',
      },
    });

    const { title } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: title || 'New Conversation',
        messageCount: 0,
      },
    });

    console.log('[Conversations] ✅ Created conversation:', conversation.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations?id=xxx
 * Delete a conversation and all its messages
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
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
