'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';

// Dynamic import prevents SSR crash from browser-only APIs (Audio, localStorage, etc.)
const HollyChatInterface = dynamic(
  () => import('@/components/holly-chat-interface'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-screen w-full bg-[#0B0A08] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B84052] animate-pulse shadow-[0_0_20px_rgba(212,168,83,0.3)]" />
          <p className="text-[#D4A853] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            Establishing Nexus Link...
          </p>
        </div>
      </div>
    ),
  }
);

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for Clerk to fully load before deciding
    if (isLoaded && !isSignedIn) {
      // Not signed in — redirect to sign-in page (client-side, no server race condition)
      window.location.href = '/sign-in';
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0B0A08] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B84052] animate-pulse shadow-[0_0_20px_rgba(212,168,83,0.3)]" />
          <p className="text-[#D4A853] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            Establishing Nexus Link...
          </p>
        </div>
      </div>
    );
  }

  // Not signed in — show nothing while redirect happens
  if (!isSignedIn) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0B0A08] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#D4A853] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ErrorBoundary>
        <HollyChatInterface />
      </ErrorBoundary>
    </div>
  );
}
