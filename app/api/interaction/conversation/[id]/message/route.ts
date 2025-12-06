/**
 * POST /api/interaction/conversation/:id/message
 * Add message to conversation
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addMessage } from '@/lib/interaction/conversation-manager';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { role, content, emotion } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }

    const result = await addMessage(
      params.id,
      userId,
      role,
      content,
      emotion
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error in add message API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
