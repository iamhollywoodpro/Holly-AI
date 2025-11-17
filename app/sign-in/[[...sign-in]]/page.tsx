import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 rounded-2xl',
              headerTitle: 'text-white text-2xl font-bold',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-purple-500/50 text-white transition-all',
              socialButtonsBlockButtonText: 'text-white font-medium',
              formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium py-3 rounded-xl transition-all',
              formFieldInput: 'bg-gray-800/50 border border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-lg',
              formFieldLabel: 'text-gray-300 font-medium',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-purple-400 hover:text-purple-300',
              footerActionText: 'text-gray-400',
              footerActionLink: 'text-purple-400 hover:text-purple-300 font-medium',
              dividerLine: 'bg-gray-700/50',
              dividerText: 'text-gray-500',
              otpCodeFieldInput: 'bg-gray-800/50 border border-gray-700/50 text-white focus:border-purple-500/50',
              formResendCodeLink: 'text-purple-400 hover:text-purple-300',
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
  )
}
