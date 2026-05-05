'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

/**
 * Force redirect to /chat after successful sign-in
 * This is a fallback in case Clerk's redirect props don't work
 */
export function useForceRedirectAfterSignIn() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // User is signed in, force redirect to /chat
      console.log('[HOLLY] Sign-in successful, redirecting to /chat');
      router.push('/chat');
    }
  }, [isLoaded, isSignedIn, router]);
}
