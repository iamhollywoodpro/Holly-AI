/**
 * Work Log Create API
 * 
 * Create a new work log entry
 * 
 * @route POST /api/work-log/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  createWorkLog, 
  type WorkLogType, 
  type WorkLogStatus 
} from '@/lib/logging/work-log-service';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      conversationId,
      logType,
      status,
      title,
      details,
      metadata,
    } = body;

    // Validate required fields
    if (!logType || !status || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: logType, status, title' },
        { status: 400 }
      );
    }

    // Create log entry
    const log = await createWorkLog({
      userId: clerkUserId,
      conversationId,
      logType: logType as WorkLogType,
      status: status as WorkLogStatus,
      title,
      details,
      metadata,
    });

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error: any) {
    console.error('[WorkLog Create] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
