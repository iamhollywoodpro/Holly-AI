import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { processOnboardingAnswer } from '@/lib/onboarding/onboarding-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/message
 * Send an answer during onboarding. Returns Holly's response + next step.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await ensureUserExists();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { answer } = body;

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    const result = await processOnboardingAnswer(user.id, answer.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error('[onboarding/message] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process answer' },
      { status: 500 },
    );
  }
}
