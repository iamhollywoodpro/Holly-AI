import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { prisma } from '@/lib/db';
import { authenticateAndLoadUser } from '@/lib/chat/auth';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // ── Phase Q3 Gap 1: Age verification is the FRONT DOOR. ────────────────
  // Holly's onboarding dialogue cannot begin until the user is verified.
  // Creator (Steve) auto-bypasses via hardcoded recognition in auth.ts.
  const authResult = await authenticateAndLoadUser();
  if (!authResult || !authResult.userId) {
    redirect('/sign-in');
  }

  if (!authResult.isCreator && authResult.dbUserId) {
    const userRecord = await prisma.user.findUnique({
      where: { id: authResult.dbUserId },
      select: { isAdult: true },
    });
    if (!userRecord?.isAdult) {
      redirect('/onboarding/age-verify?redirect=/onboarding');
    }
  }

  // ── Passed age gate — proceed to existing onboarding flow ──────────────
  // Check if user already has Google Drive connected
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      googleDriveIntegrations: true,
    },
  });

  // If already connected, mark onboarding complete and redirect
  if (user?.googleDriveIntegrations?.[0]?.isConnected) {
    redirect('/?onboarding_completed=true');
  }

  return <OnboardingFlow />;
}
