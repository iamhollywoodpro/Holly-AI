/**
 * Real-time SSE Events Endpoint
 * Phase 8.2 — Server-Sent Events for real-time features
 *
 * GET /api/realtime/events — Establish SSE connection
 *
 * Events delivered:
 * - heartbeat (every 30s)
 * - proactive_notification
 * - morning_briefing
 * - consciousness_state_change
 * - insight_delivered
 * - system_health
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sseManager } from '@/lib/realtime/sse-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Authenticate
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    // Auth failed
  }

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Register this connection
      const cleanup = sseManager.addConnection(userId, controller);

      // Handle abort signal (client disconnect)
      req.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
