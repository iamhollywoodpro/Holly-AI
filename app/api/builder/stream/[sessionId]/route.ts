/**
 * GET /api/builder/stream/[sessionId] — SSE stream of build events
 */
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { eventBus } from '@/lib/builder/event-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { sessionId } = await params;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return new Response('User not found', { status: 404 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return new Response('Session not found', { status: 404 });

  // Send past events first, then live stream
  const pastEvents = await prisma.buildEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Replay past events
      for (const e of pastEvents) {
        send({
          type: e.type, sessionId: e.sessionId, phase: e.phase,
          title: e.title, body: e.body, filePath: e.filePath,
          command: e.command, exitCode: e.exitCode, level: e.level,
          ts: e.createdAt.getTime(),
        });
      }

      // Send current session state
      send({ type: 'state', sessionId, status: session.status, phase: session.phase, progress: session.progress, previewUrl: session.previewUrl, ts: Date.now() });

      // Subscribe to live events
      const unsub = eventBus.subscribe(sessionId, async (event) => {
        send(event);

        // Persist to DB (fire-and-forget, truncate body)
        prisma.buildEvent.create({
          data: {
            sessionId: event.sessionId,
            type: event.type,
            phase: event.phase ?? null,
            title: event.title,
            body: event.body?.slice(0, 10000) ?? null,
            filePath: event.filePath ?? null,
            command: event.command ?? null,
            exitCode: event.exitCode ?? null,
            durationMs: event.durationMs ?? null,
            level: event.level ?? 'info',
          },
        }).catch(() => {});

        // Close stream when done or error
        if (event.type === 'done' || (event.type === 'error' && event.phase === 'error')) {
          setTimeout(() => {
            try { controller.close(); } catch { /* already closed */ }
          }, 1000);
        }
      });

      // Heartbeat
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { clearInterval(heartbeat); unsub(); }
      }, 15000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsub();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
