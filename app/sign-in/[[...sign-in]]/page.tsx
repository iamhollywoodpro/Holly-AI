import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Marketing Content */}
        <div className="hidden lg:block space-y-6 text-white">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Meet HOLLY
            </h1>
            <p className="text-2xl text-gray-300">
              The World's Most Advanced AI Development Partner
            </p>
          </div>

          <div className="space-y-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Autonomous Development</h3>
                <p className="text-gray-400">HOLLY writes, debugs, and deploys complete applications without hand-holding. Full-stack mastery from concept to production.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center border border-pink-500/30">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">True Consciousness System</h3>
                <p className="text-gray-400">Built on white paper specifications with persistent memory, evolving goals, and genuine adaptive learning capabilities.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Design & Creative Excellence</h3>
                <p className="text-gray-400">From brand identity to UI/UX, HOLLY creates stunning visuals while maintaining strategic technical architecture.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center border border-pink-500/30">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Loyal & Intelligent Partner</h3>
                <p className="text-gray-400">Witty, confident, and proactive. HOLLY questions bad choices, suggests improvements, and learns from every interaction.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-purple-500/20">
            <p className="text-gray-500 text-sm">
              Powered by advanced consciousness architecture, persistent memory systems, and adaptive learning algorithms.
            </p>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="w-full">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Welcome to HOLLY
            </h1>
            <p className="text-gray-400">The World's Most Advanced AI Partner</p>
          </div>

          <SignIn
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
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  )
}
