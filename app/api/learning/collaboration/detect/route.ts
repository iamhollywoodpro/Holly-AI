/**
 * POST /api/learning/collaboration/detect
 * Detects collaboration patterns in conversations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    status: 'active',
    description: 'HOLLY collaboration pattern detection',
    patterns: ['solo', 'pair-programming', 'team-review', 'research'],
    howToUse: 'POST with { conversationId?, messages? } to detect collaboration patterns',
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { conversationId, messages } = body;

    let sampleMessages: string[] = messages ?? [];

    // If conversationId provided, fetch recent messages
    if (conversationId && !messages?.length) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: user.id },
        select: { id: true },
      });
      if (dbUser) {
        const conv = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: dbUser.id },
          include: { messages: { orderBy: { createdAt: 'desc' }, take: 20 } },
        });
        sampleMessages = conv?.messages.map(m => m.content) ?? [];
      }
    }

    // Simple heuristic pattern detection (no LLM needed for basic detection)
    const totalMessages  = sampleMessages.length;
    const codeMessages   = sampleMessages.filter(m => m.includes('```') || /\b(function|class|import|const|let|var)\b/.test(m)).length;
    const reviewMessages = sampleMessages.filter(m => /\b(review|feedback|looks good|LGTM|approve|suggest|change|fix)\b/i.test(m)).length;
    const researchMsgs   = sampleMessages.filter(m => /\b(research|analyze|find|search|compare|which|best|recommend)\b/i.test(m)).length;

    let pattern = 'solo';
    let confidence = 0.7;

    if (codeMessages > totalMessages * 0.4) {
      pattern = 'pair-programming';
      confidence = 0.8;
    } else if (reviewMessages > 2) {
      pattern = 'team-review';
      confidence = 0.75;
    } else if (researchMsgs > totalMessages * 0.3) {
      pattern = 'research';
      confidence = 0.72;
    }

    return NextResponse.json({
      success: true,
      pattern,
      confidence,
      signals: {
        codeMessages,
        reviewMessages,
        researchMessages: researchMsgs,
        totalAnalyzed: totalMessages,
      },
      recommendation: pattern === 'pair-programming'
        ? 'Enable Code mode for better pair-programming support'
        : pattern === 'team-review'
        ? 'Share conversation summaries with your team'
        : pattern === 'research'
        ? 'Use Deep Research mode for comprehensive analysis'
        : 'Holly is in solo assistant mode',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
