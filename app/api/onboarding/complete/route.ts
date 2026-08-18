import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserExists } from '@/lib/auth/ensure-user';
import { markOnboardingComplete } from '@/lib/onboarding/onboarding-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/complete
 * Marks onboarding complete in the DB (used by the UI flow on finish OR skip
 * so the server-side chat gate doesn't loop the user back).
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

    await markOnboardingComplete(user.id);

    return NextResponse.json({ success: true, completed: true });
  } catch (error) {
    console.error('[onboarding/complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark onboarding complete' },
      { status: 500 },
    );
  }
}
