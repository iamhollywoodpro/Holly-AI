'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[HOLLY Global Error]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ backgroundColor: '#0A0908' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#66CCCC] text-xs font-mono tracking-[0.3em] uppercase opacity-60">
          HOLLY
        </span>
      </div>

      <div className="w-20 h-20 rounded-full bg-[#66CCCC]/10 border border-[#66CCCC]/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-[#66CCCC]" />
      </div>

      <h1 className="text-2xl font-bold text-[#F5F0E8] mb-2">
        Something hit a wrong note
      </h1>

      <p className="text-[#8C8476] text-sm max-w-md mb-8">
        HOLLY encountered an unexpected error. Don&apos;t worry — your data is safe.
        Give it another try or head back home.
      </p>

      {isDev && error.message && (
        <div className="mb-8 w-full max-w-lg rounded-lg bg-white/5 border border-white/10 p-4 text-left">
          <p className="text-xs font-mono text-[#66CCCC] mb-1">Error details (dev only)</p>
          <p className="text-sm text-[#B84052]/80 font-mono break-words">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-[#5C564D] font-mono mt-2">
              digest: {error.digest}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#66CCCC] hover:bg-[#3DAF76] text-[#0A0908] text-sm font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#BFB5A5] text-sm font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
