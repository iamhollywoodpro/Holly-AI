/**
 * Web Agent Session API
 * Create and manage browser automation sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { browserController } from '@/lib/web-agent/browser-controller';
import { nanoid } from 'nanoid';

/**
 * POST /api/web-agent/session
 * Create a new browser session
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = `session_${userId}_${nanoid()}`;

    await browserController.createSession(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[WebAgent] Session creation failed:', error);

    return NextResponse.json(
      { error: `Failed to create session: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/web-agent/session
 * Close a browser session
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    if (!sessionId.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await browserController.closeSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session closed',
    });
  } catch (error: any) {
    console.error('[WebAgent] Session closure failed:', error);

    return NextResponse.json(
      { error: `Failed to close session: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/web-agent/session/status
 * Get session status
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeCount = browserController.getActiveSessionCount();

    return NextResponse.json({
      success: true,
      activeSessions: activeCount,
    });
  } catch (error: any) {
    console.error('[WebAgent] Status check failed:', error);

    return NextResponse.json(
      { error: `Failed to get status: ${error.message}` },
      { status: 500 }
    );
  }
}
