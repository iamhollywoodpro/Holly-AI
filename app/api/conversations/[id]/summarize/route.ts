import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

type RouteContext = { params: Promise<{ id: string }>; };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    return NextResponse.json({ conversationId: id, summary: 'Conversation summary placeholder', messageCount: 0, topics: [] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to summarize conversation', message: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  return GET(req, context);
}
