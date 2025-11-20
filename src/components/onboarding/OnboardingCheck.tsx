'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

/**
 * Client component to check if user needs onboarding
 * Redirects first-time users to /onboarding
 */
export default function OnboardingCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    
    checkOnboardingStatus();
  }, [isLoaded, user]);

  const checkOnboardingStatus = async () => {
    // Skip if already on onboarding page
    if (pathname === '/onboarding') {
      setIsChecking(false);
      return;
    }
    
    // Skip if not on home page
    if (pathname !== '/') {
      setIsChecking(false);
      return;
    }

    // Skip if not authenticated
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Check if onboarding was completed
    const onboardingCompleted = localStorage.getItem('holly_onboarding_completed');
    
    if (onboardingCompleted === 'true') {
      setIsChecking(false);
      return;
    }

    // Check if user has Drive connected (skip onboarding)
    try {
      const response = await fetch('/api/google-drive/status');
      const data = await response.json();
      
      if (data.connected) {
        // Already connected, mark onboarding as complete
        localStorage.setItem('holly_onboarding_completed', 'true');
        setIsChecking(false);
        return;
      }
    } catch (error) {
      console.error('Failed to check Drive status:', error);
    }

    // Check user's account age (only show onboarding for new users)
    const userCreatedAt = new Date(user.createdAt).getTime();
    const now = Date.now();
    const daysSinceCreation = (now - userCreatedAt) / (1000 * 60 * 60 * 24);

    // Only redirect if user is less than 7 days old and hasn't completed onboarding
    if (daysSinceCreation < 7) {
      router.push('/onboarding');
    } else {
      // Old user, mark onboarding as complete
      localStorage.setItem('holly_onboarding_completed', 'true');
      setIsChecking(false);
    }
  };

  // Don't render anything
  return null;
}
