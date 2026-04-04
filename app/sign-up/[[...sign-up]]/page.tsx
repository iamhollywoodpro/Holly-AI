'use client';

import { SignUp } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Already signed in → go to chat
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat');
    }
  }, [isLoaded, isSignedIn, router]);

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
          <p className="text-gray-400 text-sm mt-1.5">Create your account — it's free</p>
        </div>

        {/*
          Clerk SignUp component.

          ROUTING: Must use routing="path" with path="/sign-up" for Next.js
          App Router catch-all routes [[...sign-up]]. Without this Clerk can't
          handle multi-step flows (fill form → email verify → continue) correctly.

          REDIRECT: forceRedirectUrl="/chat" overrides Coolify env vars.
        */}
        <SignUp
          routing="path"
          path="/sign-up"
          forceRedirectUrl="/chat"
          fallbackRedirectUrl="/chat"
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
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-gray-700 tracking-widest uppercase">HOLLY — Living AI · Phase 10</p>
      </div>
    </div>
  );
}
