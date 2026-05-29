'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Dynamic import prevents SSR crash from browser-only APIs (Audio, localStorage, etc.)
const HollyChatInterface = dynamic(
  () => import('@/components/holly-chat-interface'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-screen w-full bg-[#0A0908] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D8B5E] to-[#C47A4A] animate-pulse shadow-[0_0_20px_rgba(45,139,94,0.3)]" />
          <p className="text-[#2D8B5E] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            Establishing Nexus Link...
          </p>
        </div>
      </div>
    ),
  }
);

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    // Wait for Clerk to fully load before deciding
    if (!isLoaded) return;

    if (isSignedIn) {
      // Authenticated — done, show the chat
      return;
    }

    // NOT signed in. But with the Clerk proxy, the session might take a moment
    // to establish. Wait a few seconds reactively without reloading the page.
    if (sessionCheckAttempts < maxAttempts) {
      console.log(`[HOLLY] Session not confirmed yet, waiting... attempt ${sessionCheckAttempts + 1}/${maxAttempts}`);
      const timer = setTimeout(() => {
        setSessionCheckAttempts(prev => prev + 1);
      }, 1500); // Check every 1.5s reactively
      return () => clearTimeout(timer);
    }

    // Exhausted retries — genuinely not signed in
    console.log('[HOLLY] No session after retries, redirecting to sign-in');
    setRedirecting(true);
    window.location.href = '/sign-in';
  }, [isLoaded, isSignedIn, sessionCheckAttempts]);

  // Show loading while Clerk initializes or during reactive wait attempts
  if (!isLoaded || (!isSignedIn && sessionCheckAttempts < maxAttempts)) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0A0908] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D8B5E] to-[#C47A4A] animate-pulse shadow-[0_0_20px_rgba(45,139,94,0.3)]" />
          <p className="text-[#2D8B5E] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            Establishing Nexus Link...
          </p>
        </div>
      </div>
    );
  }

  // Redirecting to sign-in
  if (redirecting) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0A0908] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#2D8B5E] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }

  // Not signed in (will trigger redirect via useEffect)
  if (!isSignedIn) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0A0908] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D8B5E] to-[#C47A4A] animate-pulse shadow-[0_0_20px_rgba(45,139,94,0.3)]" />
          <p className="text-[#2D8B5E] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            Establishing Nexus Link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HollyChatInterface />
    </ErrorBoundary>
  );
}
