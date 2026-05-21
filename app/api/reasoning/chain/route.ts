/**
 * POST /api/reasoning/chain — Phase 20: Advanced Reasoning Chains
 *
 * Executes a multi-step reasoning chain for a complex query.
 * Streams intermediate steps as SSE events.
 *
 * Body:
 *   query              — the complex question
 *   conversationHistory — recent messages for context (optional)
 *   systemPrompt       — Holly's system prompt (optional, uses default if omitted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/user-manager';
import {
  needsReasoningChain,
  runReasoningChain,
  getReasoningStats,
  type ReasoningChainSSE,
} from '@/lib/reasoning/reasoning-chains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sendSSE(controller: ReadableStreamDefaultController, data: ReasoningChainSSE) {
  const encoded = new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
  controller.enqueue(encoded);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getOrCreateUser(authResult.userId);
    const body = await request.json() as {
      query?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
      systemPrompt?: string;
    };

    if (!body.query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    // Check if reasoning chain is needed
    const assessment = needsReasoningChain(body.query);
    if (!assessment.needed) {
      return NextResponse.json({
        phase: 20,
        needed: false,
        confidence: assessment.confidence,
        message: 'Query is simple enough for direct response',
      });
    }

    // Stream reasoning chain
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, {
            type: 'reasoning_step',
            step: {
              id: 'assessment',
              type: 'decompose',
              title: 'Assessing complexity',
              prompt: '',
              status: 'complete',
            },
          });

          const answer = await runReasoningChain(
            body.query!,
            (event) => sendSSE(controller, event),
            body.systemPrompt || 'You are Holly, an advanced AI assistant.',
            body.conversationHistory || [],
          );

          // Final SSE close
          sendSSE(controller, {
            type: 'reasoning_complete',
            chain: {
              id: `chain-${Date.now()}`,
              query: body.query!,
              steps: [],
              finalAnswer: answer,
              status: 'complete',
            },
          });

          controller.close();
        } catch (error) {
          sendSSE(controller, {
            type: 'reasoning_error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[ReasoningChain API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run reasoning chain' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reasoning/chain — Reasoning stats + complexity assessment
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('query');
    const stats = getReasoningStats();

    if (query) {
      const assessment = needsReasoningChain(query);
      return NextResponse.json({
        phase: 20,
        assessment,
        stats,
      });
    }

    return NextResponse.json({ phase: 20, stats });
  } catch (error) {
    console.error('[ReasoningChain API] GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
