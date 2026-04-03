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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      {/* Clerk sign-up form */}
      <div className="relative z-10 w-full max-w-[480px]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30">
            <span className="text-2xl font-black text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Start with HOLLY</h1>
          <p className="text-gray-400 text-sm mt-1">Create your account — free to get started</p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: '#a855f7',
              colorBackground: '#0f0f17',
              colorInputBackground: '#1a1a2e',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#9ca3af',
              colorNeutral: '#6b7280',
              borderRadius: '0.75rem',
            },
            elements: {
              rootBox: 'w-full',
              card: 'bg-gray-900/80 border border-gray-800 shadow-2xl shadow-purple-500/10 backdrop-blur-xl',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              logoBox: 'hidden',
              socialButtonsBlockButton: 'bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white transition-all',
              formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-purple-500/20',
              formFieldInput: 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500',
              formFieldLabel: 'text-gray-300 font-medium',
              footerActionLink: 'text-purple-400 hover:text-purple-300',
              identityPreviewEditButton: 'text-purple-400 hover:text-purple-300',
              dividerLine: 'bg-gray-700',
              dividerText: 'text-gray-500',
              alertText: 'text-red-400',
            },
          }}
          forceRedirectUrl="/chat"
          fallbackRedirectUrl="/chat"
          signInUrl="/sign-in"
        />
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-gray-700 tracking-widest uppercase">HOLLY — Living AI · Phase 10</p>
      </div>
    </div>
  );
}
