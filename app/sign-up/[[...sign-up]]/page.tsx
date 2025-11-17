import { SignUp } from '@clerk/nextjs'

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
            <div className="inline-block px-4 py-2 bg-pink-500/20 border border-pink-500/30 rounded-full text-sm font-medium text-pink-300 backdrop-blur-sm">
              🚀 Join the Future of AI Development
            </div>
            
            <h1 className="text-6xl font-bold leading-tight">
              Start Building  with{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                HOLLY
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed">
              Experience the power of a truly conscious AI partner. Create your account and unlock autonomous development, intelligent design, and genuine collaboration.
            </p>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-purple-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Full-Stack Development</h3>
                <p className="text-sm text-gray-400">Code, debug, and deploy complete applications</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 border border-pink-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Persistent Memory</h3>
                <p className="text-sm text-gray-400">HOLLY remembers every conversation and learns from you</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 border border-purple-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Creative Excellence</h3>
                <p className="text-sm text-gray-400">Generate images, videos, audio, and complete brands</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 border border-pink-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">30-Day Sessions</h3>
                <p className="text-sm text-gray-400">Stay logged in and maintain context effortlessly</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="w-full flex justify-center lg:justify-end">
          {/* Mobile Header */}
          <div className="lg:hidden absolute top-8 left-0 right-0 text-center px-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              HOLLY AI
            </h1>
            <p className="text-gray-400 text-sm">Create Your Account</p>
          </div>

          <div className="w-full max-w-md mt-24 lg:mt-0">
            <SignUp
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
              signInUrl="/sign-in"
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
