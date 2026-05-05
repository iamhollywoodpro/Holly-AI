import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

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
