/**
 * Work Log Stream API - Server-Sent Events
 * 
 * Real-time streaming of work log entries to the UI
 * Uses SSE for one-way server → client push
 * 
 * @route GET /api/work-log/stream
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRecentLogs } from '@/lib/logging/work-log-service';
import { registerConnection, unregisterConnection } from '@/lib/logging/connection-manager';

export const runtime = 'nodejs'; // Use Edge Runtime for better streaming

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get conversationId from query params (optional)
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') || undefined;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Register connection (with limit enforcement)
        const registration = registerConnection(clerkUserId, controller, conversationId);
        if (!registration.allowed) {
          controller.error(new Error(registration.reason));
          return;
        }

        try {
          // Send initial logs
          const logs = await getRecentLogs(clerkUserId, {
            conversationId,
            limit: 50,
          });

          // Send each log as SSE event
          for (const log of logs) {
            const data = `data: ${JSON.stringify(log)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Keep connection alive with heartbeat
          const heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch (error) {
              clearInterval(heartbeatInterval);
            }
          }, 30000); // Every 30 seconds

          // Smart polling: 3s normally, 1s during active conversation
          let lastTimestamp = logs[0]?.createdAt || new Date();
          let pollDelay = conversationId ? 1000 : 3000; // Faster polling for active conversations
          let consecutiveEmptyPolls = 0;
          
          const pollInterval = setInterval(async () => {
            try {
              const newLogs = await getRecentLogs(clerkUserId, {
                conversationId,
                limit: 10,
              });

              // Send only logs newer than last timestamp
              const freshLogs = newLogs.filter(
                (log) => new Date(log.createdAt) > lastTimestamp
              );

              if (freshLogs.length > 0) {
                consecutiveEmptyPolls = 0;
                for (const log of freshLogs) {
                  const data = `data: ${JSON.stringify(log)}\n\n`;
                  controller.enqueue(encoder.encode(data));
                  lastTimestamp = new Date(log.createdAt);
                }
              } else {
                consecutiveEmptyPolls++;
                // Back off polling if no activity (max 10s)
                if (consecutiveEmptyPolls > 5 && pollDelay < 10000) {
                  pollDelay = Math.min(pollDelay + 1000, 10000);
                }
              }
            } catch (error) {
              console.error('[SSE] Poll error:', error);
            }
          }, pollDelay);

          // Cleanup on close
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeatInterval);
            clearInterval(pollInterval);
            unregisterConnection(clerkUserId, controller);
            controller.close();
          });
        } catch (error) {
          console.error('[SSE] Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[WorkLog Stream] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
