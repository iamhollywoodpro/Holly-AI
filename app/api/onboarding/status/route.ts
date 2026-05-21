import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { getOnboardingStatus } from '@/lib/onboarding/onboarding-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/status
 * Check onboarding progress for the current user.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await ensureUserExists();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const status = await getOnboardingStatus(user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('[onboarding/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 },
    );
  }
}
