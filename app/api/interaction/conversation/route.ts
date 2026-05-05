/**
 * POST /api/interaction/conversation
 * Create new conversation
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createConversation } from '@/lib/interaction/conversation-manager';

export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title } = body;

    const result = await createConversation(userId, title);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId
    });
  } catch (error) {
    console.error('Error in create conversation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
