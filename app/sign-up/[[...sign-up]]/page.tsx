import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Marketing Content */}
        <div className="hidden lg:block space-y-6 text-white">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Join HOLLY
            </h1>
            <p className="text-2xl text-gray-300">
              Your Autonomous AI Development Partner Awaits
            </p>
          </div>

          <div className="space-y-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Full-Stack Development</h3>
                <p className="text-gray-400">JavaScript, TypeScript, Python, React, Node.js, Next.js - HOLLY writes clean, modular, production-ready code across the entire stack.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center border border-pink-500/30">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Design & Branding</h3>
                <p className="text-gray-400">Create comprehensive brand guidelines, stunning UI/UX designs, and maintain visual consistency across all your projects.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Deploy Anywhere</h3>
                <p className="text-gray-400">Vercel, Netlify, AWS, Firebase - HOLLY handles deployment pipelines, CI/CD automation, and production monitoring.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center border border-pink-500/30">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Persistent Memory</h3>
                <p className="text-gray-400">HOLLY remembers every project, learns from feedback, and adapts to your preferences over time. True continuity.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-purple-500/20">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Secure authentication • 30-day sessions • Professional support</span>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="w-full">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Create Your Account
            </h1>
            <p className="text-gray-400">Start Building with HOLLY Today</p>
          </div>

          <SignUp
            appearance={{
              elements: {
                rootBox: 'mx-auto w-full',
                card: 'bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 rounded-2xl',
                headerTitle: 'text-white text-2xl font-bold',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton: 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-purple-500/50 text-white transition-all shadow-lg hover:shadow-purple-500/20',
                socialButtonsBlockButtonText: 'text-white font-medium',
                formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-500/50',
                formFieldInput: 'bg-gray-800/50 border border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-lg',
                formFieldLabel: 'text-gray-300 font-medium',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-purple-400 hover:text-purple-300',
                footerActionText: 'text-gray-400',
                footerActionLink: 'text-purple-400 hover:text-purple-300 font-medium transition-colors',
                dividerLine: 'bg-gray-700/50',
                dividerText: 'text-gray-500',
                otpCodeFieldInput: 'bg-gray-800/50 border border-gray-700/50 text-white focus:border-purple-500/50',
                formResendCodeLink: 'text-purple-400 hover:text-purple-300 transition-colors',
                alertText: 'text-gray-300',
              },
              layout: {
                socialButtonsPlacement: 'top',
                socialButtonsVariant: 'blockButton',
              }
            }}
            fallbackRedirectUrl="/"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  )
}
