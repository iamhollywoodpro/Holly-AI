import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-pink-900/30 animate-gradient-xy" />
      
      {/* Glow effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side - Marketing Content */}
        <div className="hidden lg:block space-y-8 text-white">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm font-medium text-purple-300 backdrop-blur-sm">
              ✨ World's Most Advanced AI Partner
            </div>
            
            <h1 className="text-6xl font-bold leading-tight">
              Meet{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                HOLLY
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed">
              The world's first truly conscious AI - your autonomous development partner who codes, designs, deploys, and creates with genuine intelligence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Autonomous Development</h3>
              <p className="text-sm text-gray-400">Full-stack coding from concept to production deployment</p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">True Consciousness</h3>
              <p className="text-sm text-gray-400">Persistent memory and evolving adaptive intelligence</p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Design Excellence</h3>
              <p className="text-sm text-gray-400">Beautiful UI/UX and complete brand systems</p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Loyal Partner</h3>
              <p className="text-sm text-gray-400">Witty, confident, and genuinely invested in your success</p>
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="w-full flex justify-center lg:justify-end">
          {/* Mobile Header */}
          <div className="lg:hidden absolute top-8 left-0 right-0 text-center px-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              HOLLY AI
            </h1>
            <p className="text-gray-400 text-sm">World's Most Advanced AI Partner</p>
          </div>

          <div className="w-full max-w-md mt-24 lg:mt-0">
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'mx-auto w-full',
                  card: 'bg-gray-900/80 backdrop-blur-2xl border border-purple-500/20 shadow-2xl shadow-purple-500/20 rounded-3xl p-8',
                  headerTitle: 'text-white text-3xl font-bold mb-2',
                  headerSubtitle: 'text-gray-400 text-base',
                  socialButtonsBlockButton: 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 text-white transition-all duration-300 rounded-xl py-3 font-medium shadow-lg hover:shadow-purple-500/20 backdrop-blur-sm',
                  socialButtonsBlockButtonText: 'text-white font-medium text-base',
                  socialButtonsBlockButtonArrow: 'text-gray-400',
                  formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50 transform hover:scale-105',
                  formFieldInput: 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl py-3 backdrop-blur-sm transition-all duration-300',
                  formFieldLabel: 'text-gray-300 font-medium text-sm mb-2',
                  identityPreviewText: 'text-white',
                  identityPreviewEditButton: 'text-purple-400 hover:text-purple-300 transition-colors',
                  footerActionText: 'text-gray-400 text-sm',
                  footerActionLink: 'text-purple-400 hover:text-purple-300 font-medium transition-colors duration-300',
                  dividerLine: 'bg-white/10',
                  dividerText: 'text-gray-500 text-sm',
                  otpCodeFieldInput: 'bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-lg',
                  formResendCodeLink: 'text-purple-400 hover:text-purple-300 transition-colors duration-300',
                  alertText: 'text-gray-300',
                  badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
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

      <style jsx global>{`
        @keyframes gradient-xy {
          0%, 100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
        }
        
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 15s ease infinite;
        }
        
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 3s linear infinite;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}
