'use client';

/**
 * Phase Q2 — Tier 1 Age Verification UI
 *
 * Self-attestation form: birthdate + legal agreement.
 * Calls POST /api/auth/verify-age with the user's input.
 *
 * On success: redirects to `redirectTo` prop (default "/").
 * On underage: shows denial screen.
 * If already verified: shows status + offers re-verify only if method is upgradeable.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AgeVerificationProps {
  user: {
    email: string;
    name: string | null;
    isAdult: boolean;
    currentMethod: string | null;
    verifiedAt: string | null;
  };
  redirectTo: string;
}

export default function AgeVerification({ user, redirectTo }: AgeVerificationProps) {
  const router = useRouter();
  const [birthdate, setBirthdate] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // ── Already verified state ────────────────────────────────────────────────
  if (user.isAdult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900/60 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Adult Access Active</h1>
            <p className="text-gray-400 text-sm mb-6">
              Your age has been verified. All features are unlocked.
            </p>
            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Method:</span>
                <span className="text-gray-300 capitalize">
                  {(user.currentMethod || 'unknown').replace(/_/g, ' ')}
                </span>
              </div>
              {user.verifiedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Verified:</span>
                  <span className="text-gray-300">
                    {new Date(user.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push(redirectTo)}
              className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Underage denial state ──────────────────────────────────────────────────
  if (errorCode === 'UNDERAGE') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900/60 border border-red-900/40 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
            <p className="text-gray-400 text-sm mb-6">
              You must be 18 or older to access adult content. This decision is final and cannot be appealed.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition"
            >
              Return to Holly
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Verification form ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);

    if (!birthdate) {
      setError('Please enter your birthdate.');
      return;
    }
    if (!agreement) {
      setError('You must agree to the adult content terms.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthdate,
          agreement: true,
          jurisdiction: jurisdiction || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setErrorCode(data.code || null);
        setSubmitting(false);
        return;
      }

      // Success — redirect to where they came from
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded-full text-xs text-pink-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            18+ Only
          </div>
          <h1 className="text-3xl font-semibold mb-2">Age Verification Required</h1>
          <p className="text-gray-400 text-sm">
            Holly offers adult content and features. Please verify you are 18 or older.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm space-y-5"
        >
          {/* Birthdate */}
          <div>
            <label htmlFor="birthdate" className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth
            </label>
            <input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
              required
              className="w-full px-4 py-3 bg-gray-950/70 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition"
            />
          </div>

          {/* Jurisdiction (optional) */}
          <div>
            <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-300 mb-2">
              Region <span className="text-gray-500 font-normal">(optional, for jurisdiction-aware ToS)</span>
            </label>
            <select
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950/70 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition"
            >
              <option value="">Select your region (optional)</option>
              <optgroup label="United States">
                <option value="US-AL">Alabama</option>
                <option value="US-AK">Alaska</option>
                <option value="US-AZ">Arizona</option>
                <option value="US-CA">California</option>
                <option value="US-CO">Colorado</option>
                <option value="US-FL">Florida</option>
                <option value="US-GA">Georgia</option>
                <option value="US-IL">Illinois</option>
                <option value="US-MA">Massachusetts</option>
                <option value="US-MD">Maryland</option>
                <option value="US-MI">Michigan</option>
                <option value="US-MN">Minnesota</option>
                <option value="US-NC">North Carolina</option>
                <option value="US-NJ">New Jersey</option>
                <option value="US-NV">Nevada</option>
                <option value="US-NY">New York</option>
                <option value="US-OH">Ohio</option>
                <option value="US-OR">Oregon</option>
                <option value="US-PA">Pennsylvania</option>
                <option value="US-TX">Texas</option>
                <option value="US-VA">Virginia</option>
                <option value="US-WA">Washington</option>
                <option value="US-OTHER">Other US State</option>
              </optgroup>
              <optgroup label="Canada">
                <option value="CA-ON">Ontario</option>
                <option value="CA-QC">Quebec</option>
                <option value="CA-BC">British Columbia</option>
                <option value="CA-AB">Alberta</option>
                <option value="CA-OTHER">Other Province</option>
              </optgroup>
              <optgroup label="Other">
                <option value="UK">United Kingdom</option>
                <option value="EU">European Union</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other</option>
              </optgroup>
            </select>
          </div>

          {/* Agreement */}
          <div className="bg-gray-950/40 border border-gray-800 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreement}
                onChange={(e) => setAgreement(e.target.checked)}
                required
                className="mt-1 w-4 h-4 accent-pink-500"
              />
              <span className="text-xs text-gray-300 leading-relaxed">
                I confirm that I am at least <span className="font-medium text-white">18 years old</span>,
                the birthdate above is accurate, and I am legally permitted to access adult content
                in my jurisdiction. I understand this content includes explicit material and consent
                to viewing it.
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 border border-red-900/40 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !agreement || !birthdate}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium rounded-lg hover:from-pink-500 hover:to-rose-500 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-pink-600 disabled:hover:to-rose-600"
          >
            {submitting ? 'Verifying...' : 'Verify Age & Continue'}
          </button>

          <p className="text-[10px] text-gray-600 text-center leading-relaxed">
            Tier 1 self-attestation verification. Your verification is logged with timestamp and IP.
            Misrepresentation of age is a violation of our Terms of Service and may be prosecuted
            under applicable law.
          </p>
        </form>

        {/* Phase Q3 Gap 1: Skip button REMOVED.
            Age verification is the front door to Holly — no side entrances.
            Users who genuinely cannot verify today can sign out via the
            header (Clerk) and return when ready. The denial screen for
            underage users (above) is the only terminal state. */}
      </div>
    </div>
  );
}
