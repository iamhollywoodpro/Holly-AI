/**
 * Work Log List API
 * 
 * Fetch work logs for a user (polling fallback if SSE not supported)
 * 
 * @route GET /api/work-log/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRecentLogs, getConversationLogs } from '@/lib/logging/work-log-service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const scope = searchParams.get('scope') || 'user'; // 'user' or 'conversation'

    // Fetch logs based on scope
    let logs;
    if (scope === 'conversation' && conversationId) {
      logs = await getConversationLogs(conversationId, limit);
    } else {
      logs = await getRecentLogs(clerkUserId, {
        conversationId: conversationId || undefined,
        limit,
      });
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      scope,
    });
  } catch (error: any) {
    console.error('[WorkLog List] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
