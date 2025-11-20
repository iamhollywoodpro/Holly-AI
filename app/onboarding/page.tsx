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
  const driveConnection = await prisma.googleDriveConnection.findUnique({
    where: { userId }
  });
  
  // If already connected, skip onboarding
  if (driveConnection?.isConnected) {
    redirect('/');
  }
  
  return <OnboardingScreen />;
}
