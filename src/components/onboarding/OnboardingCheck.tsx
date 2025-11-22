'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

/**
 * Client component to check if user needs onboarding
 * Redirects first-time users to /onboarding
 */
export default function OnboardingCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    
    // Check if we're coming back from onboarding with Drive connected
    const onboardingCompleted = searchParams.get('onboarding_completed');
    const driveSuccess = searchParams.get('success');
    
    if (onboardingCompleted === 'true' || driveSuccess === 'drive_connected') {
      localStorage.setItem('holly_onboarding_completed', 'true');
      // Clean the URL
      router.replace('/');
      return;
    }
    
    checkOnboardingStatus();
  }, [isLoaded, user, searchParams]);

  const checkOnboardingStatus = async () => {
    // DISABLED: Onboarding is now optional via chat interface
    // Drive and GitHub connections are accessible through indicators in header
    // Users can connect at their convenience without forced onboarding flow
    
    // Always mark onboarding as complete (opt-in via chat instead of forced flow)
    localStorage.setItem('holly_onboarding_completed', 'true');
    console.log('✅ Onboarding disabled - Drive/GitHub connections available via header');
    setIsChecking(false);
    return;
  };

  // Don't render anything
  return null;
}
