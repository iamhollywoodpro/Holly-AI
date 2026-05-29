'use client';

import { SignUp } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const PUBLIC_ORIGIN = 'https://holly.nexamusicgroup.com';
const DOCKER_ORIGINS = ['0.0.0.0', 'localhost', '127.0.0.1'];

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [clerkReady, setClerkReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Already signed in → go to chat (client-side only, no server redirect)
  useEffect(() => {
    if (isLoaded && isSignedIn && !redirecting) {
      console.log('[HOLLY] Sign-up complete, redirecting to /chat');
      setRedirecting(true);
      // Hard navigation only — no router.replace which can race with middleware
      window.location.href = '/chat';
    }
  }, [isLoaded, isSignedIn, redirecting]);

  // Show content once Clerk has initialised
  useEffect(() => {
    if (isLoaded) {
      setClerkReady(true);
    }
  }, [isLoaded]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0908] px-4 relative overflow-hidden">
      {/* Background glow — emerald/copper warmth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#2D8B5E]/8 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#C47A4A]/6 blur-[100px]" />
      </div>

      {/* Card container */}
      <div className="relative z-10 w-full max-w-[480px]">
        {/* HOLLY branding header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D8B5E] to-[#C47A4A] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#2D8B5E]/30">
            <span className="text-2xl font-black text-[#0A0908]">H</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F5F0E8] tracking-tight">Start with HOLLY</h1>
          <p className="text-[#8C8476] text-sm mt-1.5">Create your account — it&apos;s free</p>
        </div>

        {/* Loading state shown while Clerk initialises */}
        {!clerkReady && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-[#2D8B5E] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#5C564D] text-sm">Loading...</p>
          </div>
        )}

        {/* Redirecting state */}
        {redirecting && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-[#3DAF76] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#3DAF76] text-sm font-medium">Welcome to HOLLY!</p>
            <p className="text-[#5C564D] text-xs">Redirecting to chat...</p>
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
            signInUrl="/sign-in"
            appearance={{
              variables: {
                colorPrimary: '#2D8B5E',
                colorBackground: '#141210',
                colorInputBackground: '#1E1B18',
                colorInputText: '#F5F0E8',
                colorText: '#F5F0E8',
                colorTextSecondary: '#8C8476',
                colorNeutral: '#5C564D',
                borderRadius: '0.75rem',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-[#141210]/90 border border-[#2D8B5E]/15 shadow-2xl shadow-[#2D8B5E]/10 backdrop-blur-xl rounded-2xl',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                logoBox: 'hidden',
                socialButtonsBlockButton:
                  'bg-[#1E1B18] border border-[#2D8B5E]/10 hover:bg-[#141210] hover:border-[#2D8B5E]/20 text-[#F5F0E8] transition-all duration-200',
                socialButtonsBlockButtonText: 'text-[#F5F0E8] font-medium',
                formButtonPrimary:
                  'bg-gradient-to-r from-[#2D8B5E] to-[#C47A4A] hover:from-[#3DAF76] hover:to-[#E8A862] text-[#0A0908] font-semibold transition-all duration-200 shadow-lg shadow-[#2D8B5E]/20',
                dividerLine: 'bg-[#1E1B18]',
                dividerText: 'text-[#5C564D]',
                footerActionLink: 'text-[#2D8B5E] hover:text-[#3DAF76] transition-colors',
                identityPreviewEditButton: 'text-[#2D8B5E] hover:text-[#3DAF76]',
                alertText: 'text-[#B84052]',
                formFieldErrorText: 'text-[#B84052]',
              },
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-[#2D8B5E]/30 tracking-widest uppercase">HOLLY — Living AI</p>
      </div>
    </div>
  );
}
