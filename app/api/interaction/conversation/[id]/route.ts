/**
 * GET /api/interaction/conversation/:id
 * Get conversation with optional messages
 * 
 * DELETE /api/interaction/conversation/:id
 * Delete conversation
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getConversation, deleteConversation } from '@/lib/interaction/conversation-manager';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeMessages = searchParams.get('includeMessages') === 'true';

    const result = await getConversation(params.id, includeMessages);

    if (!result) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in get conversation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteConversation(params.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error) {
    console.error('Error in delete conversation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
