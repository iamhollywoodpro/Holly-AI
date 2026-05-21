'use client';

import { SignUp } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const PUBLIC_ORIGIN = 'https://holly.nexamusicgroup.com';
const DOCKER_ORIGINS = ['0.0.0.0', 'localhost', '127.0.0.1'];

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [clerkReady, setClerkReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Already signed in → go to chat
  useEffect(() => {
    if (isLoaded && isSignedIn && !redirecting) {
      console.log('[HOLLY] Sign-up complete, redirecting to /chat...', {
        isLoaded,
        isSignedIn,
        timestamp: new Date().toISOString(),
      });
      setRedirecting(true);
      
      // Try router.replace first (Next.js client-side navigation)
      router.replace('/chat');
      
      // Backup: force hard redirect after 1 second if router.replace doesn't work
      setTimeout(() => {
        if (window.location.pathname === '/sign-up') {
          console.warn('[HOLLY] router.replace failed, forcing hard redirect');
          window.location.href = `${PUBLIC_ORIGIN}/chat`;
        }
      }, 1000);
    }
  }, [isLoaded, isSignedIn, router, redirecting]);

  // Show content once Clerk has initialised
  useEffect(() => {
    if (isLoaded) {
      setClerkReady(true);
    }
  }, [isLoaded]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-purple-600/8 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-600/6 blur-[100px]" />
      </div>

      {/* Card container */}
      <div className="relative z-10 w-full max-w-[480px]">
        {/* HOLLY branding header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30">
            <span className="text-2xl font-black text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Start with HOLLY</h1>
          <p className="text-gray-400 text-sm mt-1.5">Create your account — it&apos;s free</p>
        </div>

        {/* Loading state shown while Clerk initialises */}
        {!clerkReady && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        )}

        {/* Redirecting state */}
        {redirecting && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-green-400 text-sm font-medium">Welcome to HOLLY!</p>
            <p className="text-gray-600 text-xs">Redirecting to chat...</p>
          </div>
        )}

        {/*
          Clerk SignUp component — only rendered once Clerk has initialised.

          ROUTING: Must use routing="path" with path="/sign-up" for Next.js
          App Router catch-all routes [[...sign-up]]. Without this Clerk can't
          handle multi-step flows (fill form → email verify → continue) correctly.

          REDIRECT: Use absolute URLs because Clerk with proxyUrl resolves relative
          paths against the proxy subdomain (clerk.nexamusicgroup.com) instead
          of the main app domain, causing "invalid redirect_url" 422 errors.
        */}
        {clerkReady && !redirecting && (
          <SignUp
            routing="path"
            path="/sign-up"
            forceRedirectUrl={`${PUBLIC_ORIGIN}/chat`}
            fallbackRedirectUrl={`${PUBLIC_ORIGIN}/chat`}
            signInUrl="/sign-in"
            appearance={{
              variables: {
                colorPrimary: '#a855f7',
                colorBackground: '#0f0f17',
                colorInputBackground: '#1a1a2e',
                colorInputText: '#ffffff',
                colorText: '#ffffff',
                colorTextSecondary: '#9ca3af',
                colorNeutral: '#4b5563',
                borderRadius: '0.75rem',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#0f0f17]/90 border border-gray-800/60 shadow-2xl shadow-purple-900/20 backdrop-blur-xl rounded-2xl',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                logoBox: 'hidden',
                socialButtonsBlockButton:
                  'bg-gray-900 border border-gray-700/60 hover:bg-gray-800 hover:border-gray-600 text-white transition-all duration-200',
                socialButtonsBlockButtonText: 'text-white font-medium',
                formButtonPrimary:
                  'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-purple-900/30',
                dividerLine: 'bg-gray-800',
                dividerText: 'text-gray-600',
                footerActionLink: 'text-purple-400 hover:text-purple-300 transition-colors',
                identityPreviewEditButton: 'text-purple-400 hover:text-purple-300',
                alertText: 'text-red-400',
                formFieldErrorText: 'text-red-400',
              },
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-gray-700 tracking-widest uppercase">HOLLY — Living AI · Phase 10</p>
      </div>
    </div>
  );
}
