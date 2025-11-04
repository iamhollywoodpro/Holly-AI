'use client';

// HOLLY Phase 2C: Login Page
// Beautiful login interface with magic link and password options

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { HollyAvatar } from '@/components/holly-avatar';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  const { signInWithEmail, signInWithMagicLink } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (useMagicLink) {
        const { error } = await signInWithMagicLink(email);
        if (error) {
          setError(error.message);
        } else {
          setMagicLinkSent(true);
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError(error.message);
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-holly-bg-dark via-purple-900/20 to-holly-bg-dark p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-card p-8 text-center"
        >
          <div className="flex justify-center mb-6">
            <Mail className="w-16 h-16 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
          <p className="text-gray-300 mb-6">
            We've sent a magic link to <span className="text-purple-400 font-semibold">{email}</span>
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Click the link in the email to sign in. The link will expire in 1 hour.
          </p>
          <button
            onClick={() => {
              setMagicLinkSent(false);
              setEmail('');
            }}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            ← Back to login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-holly-bg-dark via-purple-900/20 to-holly-bg-dark p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HollyAvatar emotion="confident" size="xl" animated={true} />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2 flex items-center justify-center gap-2">
            HOLLY
            <Sparkles className="w-6 h-6 text-holly-gold-400" />
          </h1>
          <p className="text-gray-400">Your AI Development Partner</p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Password Input (only if not using magic link) */}
            {!useMagicLink && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={!useMagicLink}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-600/50 disabled:to-pink-600/50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {useMagicLink ? 'Sending Magic Link...' : 'Signing In...'}
                </>
              ) : (
                <>
                  {useMagicLink ? 'Send Magic Link' : 'Sign In'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Toggle Auth Method */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setUseMagicLink(!useMagicLink)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                {useMagicLink
                  ? 'Use password instead'
                  : 'Use magic link instead (no password needed)'}
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <a href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold">
                Sign Up
              </a>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          💜 Built with love by HOLLY & Hollywood
        </p>
      </motion.div>
    </div>
  );
}
