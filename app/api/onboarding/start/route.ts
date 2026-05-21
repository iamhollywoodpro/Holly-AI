import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { startOnboarding } from '@/lib/onboarding/onboarding-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/start
 * Start or resume an onboarding conversation.
 */
export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await ensureUserExists();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await startOnboarding(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[onboarding/start] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 },
    );
  }
}
