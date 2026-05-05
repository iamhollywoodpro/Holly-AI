/**
 * Work Log Create API
 * 
 * Create a new work log entry
 * 
 * @route POST /api/work-log/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWorkLog } from '@/lib/logging/work-log-service';

export const runtime = 'nodejs';


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
      taskName,
      description,
      details,
      duration = 0,
      category,
      tags,
      metadata,
      startedAt,
      completedAt,
    } = body;

    // Validate required fields
    if (!taskName) {
      return NextResponse.json(
        { error: 'Missing required field: taskName' },
        { status: 400 }
      );
    }

    // Create log entry
    const log = await createWorkLog({
      userId: clerkUserId,
      conversationId,
      taskName,
      description,
      details,
      duration,
      category,
      tags,
      metadata,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      completedAt: completedAt ? new Date(completedAt) : new Date(),
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
