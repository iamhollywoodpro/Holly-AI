/**
 * GET /api/interaction/conversation/:id/context
 * Get conversation context with recent messages
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getConversationContext } from '@/lib/interaction/conversation-manager';

export const runtime = 'nodejs';


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
    const messageLimit = searchParams.get('messageLimit')
      ? parseInt(searchParams.get('messageLimit')!)
      : 10;

    const context = await getConversationContext(params.id, messageLimit);

    if (!context) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...context
    });
  } catch (error) {
    console.error('Error in get conversation context API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
