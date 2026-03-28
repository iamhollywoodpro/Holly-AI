'use client';

/**
 * /factor-two — Clerk MFA second-factor verification page
 *
 * Clerk redirects here after the user enters their email verification code
 * (OTP / second factor). Without this page the app shows a 404.
 *
 * This page renders Clerk's built-in <SignIn> component which handles the
 * second-factor step natively. Once verified, the user is sent to /chat.
 */

import { SignIn } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function FactorTwoPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // If already fully authenticated — skip straight to chat
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-4">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight mb-1">Verify Your Identity</h1>
          <p className="text-gray-500 text-sm">Enter the code from your email to continue</p>
        </div>

        {/* Clerk handles the MFA/email-code verification UI */}
        <div className="bg-gray-950/90 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent shadow-none p-0 border-0',
                headerTitle: 'text-white font-semibold text-base',
                headerSubtitle: 'text-gray-400 text-xs',
                formButtonPrimary:
                  'bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-medium text-sm py-3 rounded-xl transition-all w-full mt-2',
                formFieldInput:
                  'bg-gray-800/80 border border-gray-700 focus:border-purple-500 text-white placeholder:text-gray-600 rounded-xl px-4 py-3 text-sm transition-all',
                formFieldLabel: 'text-gray-400 text-xs font-medium mb-1',
                otpCodeFieldInput:
                  'bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl text-center text-lg font-bold',
                footerActionText: 'text-gray-500 text-xs',
                footerActionLink: 'text-purple-400 hover:text-white font-medium text-xs transition-colors',
                alertText: 'text-red-400 text-xs',
              },
            }}
            forceRedirectUrl="/chat"
            fallbackRedirectUrl="/chat"
          />
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-gray-600 mt-4">
          <a href="/" className="text-purple-400/70 hover:text-purple-300 transition-colors">
            ← Back to HOLLY
          </a>
        </p>
      </motion.div>
    </div>
  );
}
