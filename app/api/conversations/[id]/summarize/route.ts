import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }>; };

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const userMsg = messages.find(m => m.role === 'user')?.content ?? '';
  const routeResult = smartRoute(userMsg, { taskHint: 'long_context' });
  const { text } = await cascadeCollect(
    routeResult.waterfall,
    messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
    { temperature: 0.3, maxTokens: 1024 },
  );
  return text ?? '';
}

function parseJSON<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  try { return JSON.parse(cleaned) as T; } catch { return fallback; }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // Look up conversation with messages
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true, createdAt: true },
        },
        summary: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Return cached summary if available and up-to-date
    if (conversation.summary?.summary) {
      return NextResponse.json({
        conversationId: id,
        summary: conversation.summary.summary,
        keyPoints: conversation.summary.keyPoints ?? [],
        topics: conversation.summary.topics ?? [],
        outcome: conversation.summary.outcome ?? null,
        actionItems: conversation.summary.actionItems ?? [],
        messageCount: conversation.summary.messageCount,
        cached: true,
      });
    }

    if (!conversation.messages.length) {
      return NextResponse.json({
        conversationId: id,
        summary: 'No messages in this conversation yet.',
        keyPoints: [],
        topics: [],
        outcome: null,
        actionItems: [],
        messageCount: 0,
        cached: false,
      });
    }

    // Build transcript (limit to 8000 chars to stay within context)
    const transcript = conversation.messages
      .map(m => `${m.role === 'user' ? 'User' : 'HOLLY'}: ${m.content}`)
      .join('\n')
      .slice(0, 8000);

    const systemPrompt = `You are HOLLY's memory system. Summarize conversations concisely and accurately.
Always respond with a valid JSON object matching this exact structure — no extra text:
{
  "summary": "2-4 sentence plain-English summary of the conversation",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "topics": ["topic1", "topic2"],
  "outcome": "What was decided or accomplished, or null if inconclusive",
  "actionItems": ["action item 1"]
}`;

    const userPrompt = `Summarize this conversation:\n\n${transcript}`;

    let parsed: any = null;
    try {
      const raw = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      parsed = parseJSON(raw, null);
    } catch (err: any) {
      console.warn('[Summarize] AI cascade failed:', err.message);
    }

    // Fallback: extract basic topics from message content
    if (!parsed) {
      const firstUserMsg = conversation.messages.find(m => m.role === 'user')?.content ?? '';
      parsed = {
        summary: firstUserMsg.slice(0, 200) + (firstUserMsg.length > 200 ? '…' : ''),
        keyPoints: [],
        topics: [],
        outcome: null,
        actionItems: [],
      };
    }

    // Upsert summary in DB for future cache hits
    try {
      await prisma.conversationSummary.upsert({
        where: { conversationId: id },
        create: {
          conversationId: id,
          userId,
          summary: parsed.summary ?? '',
          keyPoints: parsed.keyPoints ?? [],
          topics: parsed.topics ?? [],
          outcome: parsed.outcome ?? null,
          actionItems: parsed.actionItems ?? [],
          messageCount: conversation.messages.length,
          cached: false,
        },
        update: {
          summary: parsed.summary ?? '',
          keyPoints: parsed.keyPoints ?? [],
          topics: parsed.topics ?? [],
          outcome: parsed.outcome ?? null,
          actionItems: parsed.actionItems ?? [],
          messageCount: conversation.messages.length,
          cached: false,
        },
      });
    } catch (dbErr: any) {
      console.warn('[Summarize] DB upsert failed:', dbErr.message);
    }

    return NextResponse.json({
      conversationId: id,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints ?? [],
      topics: parsed.topics ?? [],
      outcome: parsed.outcome ?? null,
      actionItems: parsed.actionItems ?? [],
      messageCount: conversation.messages.length,
      cached: false,
    });

  } catch (error: any) {
    console.error('[Summarize] Error:', error);
    return NextResponse.json({ error: 'Failed to summarize conversation', message: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  return GET(req, context);
}
