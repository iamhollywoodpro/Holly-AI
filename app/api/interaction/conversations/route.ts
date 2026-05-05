/**
 * GET /api/interaction/conversations
 * List user conversations
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listConversations } from '@/lib/interaction/conversation-manager';

export const runtime = 'nodejs';


export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50;

    const conversations = await listConversations(userId, limit);

    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Error in list conversations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
