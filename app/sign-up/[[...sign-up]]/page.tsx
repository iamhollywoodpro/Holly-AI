'use client'

import { SignUp } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  // Already signed in → skip sign-up, go to chat
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat')
    }
  }, [isLoaded, isSignedIn, router])
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#040206] font-sans overflow-hidden selection:bg-[#0dccf2]/30 relative px-4">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at bottom left, rgba(107, 33, 168, 0.15) 0%, transparent 40%), radial-gradient(circle at bottom right, rgba(107, 33, 168, 0.15) 0%, transparent 40%)'
      }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0dccf2]/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center h-full max-h-[900px]">
        {/* Sign Up Form (Clerk) directly in center */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[440px]">
            <SignUp
              appearance={{
                elements: {
                  rootBox: 'mx-auto w-full',
                  card: 'bg-[#101F22]/40 backdrop-blur-[40px] border-[0.5px] border-[#0dccf2]/15 shadow-2xl rounded-xl p-12 transition-all',
                  headerTitle: 'text-white text-xl font-light tracking-[0.4em] uppercase mb-2',
                  headerSubtitle: 'text-slate-500 text-[10px] uppercase tracking-[0.2em]',
                  socialButtonsBlockButton: 'bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all duration-300 rounded-lg py-3 font-medium backdrop-blur-sm',
                  socialButtonsBlockButtonText: 'text-white font-light text-sm tracking-wide',
                  formButtonPrimary: 'bg-gradient-to-r from-[#6b21a8] to-[#0dccf2] hover:opacity-90 text-[#040206] font-medium text-sm py-4 rounded-lg transition-opacity shadow-lg shadow-[#0dccf2]/10 tracking-[0.2em] uppercase w-full mt-4',
                  formFieldInput: 'bg-transparent border-b border-[#0dccf2]/30 border-t-0 border-x-0 focus:border-[#0dccf2] focus:ring-0 text-white placeholder:text-slate-700 transition-all duration-300 py-3 px-0 font-light text-base rounded-none',
                  formFieldLabel: 'text-[#0dccf2]/60 text-[10px] uppercase tracking-[0.2em] mb-1 transition-all',
                  identityPreviewText: 'text-white',
                  identityPreviewEditButton: 'text-[#0dccf2] hover:text-white transition-colors',
                  footerActionText: 'text-slate-500 text-[10px] uppercase tracking-[0.2em]',
                  footerActionLink: 'text-[#0dccf2] hover:text-white font-medium uppercase text-[10px] tracking-[0.2em] transition-colors ml-2',
                  dividerLine: 'bg-[#0dccf2]/20',
                  dividerText: 'text-slate-600 text-[10px] uppercase tracking-widest',
                  alertText: 'text-red-400 font-light text-xs tracking-wide',
                  logoImage: 'hidden',
                  logoBox: 'hidden',
                },
                layout: {
                  socialButtonsVariant: 'blockButton',
                  logoImageUrl: '/assets/holly_logo_premium.png',
                  logoPlacement: 'inside'
                }
              }}
              forceRedirectUrl="/chat"
              fallbackRedirectUrl="/chat"
              signInUrl="/sign-in"
            />
          </div>
        </div>
      </div>

      {/* Neural Link Status Footer */}
      <div className="absolute bottom-8 left-0 w-full flex flex-col items-center gap-4 z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[#0dccf2] animate-pulse"></div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#0dccf2]/40">Neural Link: Stable</p>
        </div>
        <div className="h-px w-8 bg-[#0dccf2]/10"></div>
        <p className="text-[8px] uppercase tracking-[0.5em] text-slate-600">Secure Terminal Access 001-X</p>
      </div>
    </div>
  )
}
