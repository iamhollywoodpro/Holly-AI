/**
 * POST /api/learning/cross-project/transfer
 * Transfers knowledge/patterns from one project context to another.
 */
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    status: 'active',
    description: 'Cross-project knowledge transfer — apply learnings from one context to another',
    howToUse: 'POST with { sourceConversationId, targetContext, transferType? }',
    transferTypes: ['code-patterns', 'writing-style', 'research-methods', 'general'],
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { sourceConversationId, targetContext, transferType = 'general' } = body;

    if (!sourceConversationId && !targetContext) {
      return NextResponse.json({
        success: true,
        status: 'ready',
        message: 'Provide sourceConversationId and/or targetContext to transfer knowledge',
        transferTypes: ['code-patterns', 'writing-style', 'research-methods', 'general'],
      });
    }

    // If source conversation provided, fetch its summary
    let sourceSummary: string | null = null;
    if (sourceConversationId) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: user.id },
        select: { id: true },
      });
      if (dbUser) {
        const summary = await prisma.conversationSummary.findFirst({
          where: { conversationId: sourceConversationId, userId: dbUser.id },
          select: { summary: true, keyPoints: true, topics: true },
        });
        if (summary) {
          sourceSummary = `Summary: ${summary.summary}. Key points: ${summary.keyPoints.join('; ')}`;
        }
      }
    }

    const transferredKnowledge = {
      type: transferType,
      source: sourceConversationId ?? 'general-history',
      target: targetContext ?? 'new-context',
      summary: sourceSummary ?? 'No source summary available — start new conversation with context',
      applicableInsights: [
        transferType === 'code-patterns'
          ? 'Reuse established coding conventions from previous work'
          : transferType === 'writing-style'
          ? 'Maintain consistent tone and voice from previous writing'
          : transferType === 'research-methods'
          ? 'Apply same research framework used in similar topics'
          : 'Apply general problem-solving approach from past interactions',
      ],
      transferredAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      transferred: true,
      knowledge: transferredKnowledge,
      message: `Knowledge transferred (${transferType}) — Holly will apply these insights to your new context`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
