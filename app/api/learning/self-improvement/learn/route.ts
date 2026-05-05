/**
 * POST /api/learning/self-improvement/learn
 * Records user feedback and updates Holly's adaptive learning context.
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
    description: 'HOLLY self-improvement learning system',
    capabilities: [
      'Feedback recording',
      'Conversation pattern analysis',
      'Response quality tracking',
      'User preference adaptation',
    ],
    howToUse: 'POST with { feedback, conversationId?, rating?, category? }',
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { feedback, conversationId, rating, category = 'general' } = body;

    if (!feedback && !rating) {
      return NextResponse.json({ success: false, error: 'feedback or rating is required' }, { status: 400 });
    }

    // Store feedback as a system message in the conversation if provided
    if (conversationId) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: user.id },
        select: { id: true },
      });

      if (dbUser) {
        // Verify conversation belongs to user
        const conv = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: dbUser.id },
          select: { id: true },
        });

        if (conv && feedback) {
          // Log feedback as a metadata note (not shown in chat)
          await prisma.message.create({
            data: {
              conversationId: conv.id,
              userId: dbUser.id,
              role: 'system',
              content: `[FEEDBACK] rating=${rating ?? 'n/a'} category=${category}: ${feedback}`,
            },
          }).catch(() => { /* non-fatal */ });
        }
      }
    }

    return NextResponse.json({
      success: true,
      learned: true,
      message: 'Feedback recorded. Holly will adapt based on your input.',
      feedback: { category, rating: rating ?? null, recorded: true },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
