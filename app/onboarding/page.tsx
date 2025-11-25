import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingScreen from '@/components/onboarding/OnboardingScreen';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function OnboardingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // Check if user already has Google Drive connected
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      googleDriveIntegrations: true
    }
  });
  
  // If already connected, mark onboarding complete and redirect
  if (user?.googleDriveIntegrations?.[0]?.isConnected) {
    // Mark onboarding as completed in a way that persists
    // We'll use a query parameter to signal completion
    redirect('/?onboarding_completed=true');
  }
  
  return <OnboardingScreen />;
}
