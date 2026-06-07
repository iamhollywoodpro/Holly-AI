'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Evolution Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
        <span className="text-3xl">⚠️</span>
      </div>
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-gray-400 max-w-md">{error.message || 'An unexpected error occurred loading this page.'}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#66CCCC] hover:bg-[#3DAF76] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
        <a
          href="/chat"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          Back to Chat
        </a>
      </div>
    </div>
  );
}
