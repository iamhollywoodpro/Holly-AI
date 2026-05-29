import Link from 'next/link';
import { Music, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ backgroundColor: '#0A0908' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#2D8B5E] text-xs font-mono tracking-[0.3em] uppercase opacity-60">
          HOLLY
        </span>
      </div>

      <div className="w-24 h-24 rounded-full bg-[#2D8B5E]/10 border border-[#2D8B5E]/20 flex items-center justify-center mb-8">
        <Music className="w-12 h-12 text-[#2D8B5E]" />
      </div>

      <h1 className="text-6xl font-bold text-[#F5F0E8] mb-3">404</h1>

      <p className="text-xl font-semibold text-[#BFB5A5] mb-2">
        This track doesn&apos;t exist
      </p>

      <p className="text-[#5C564D] text-sm max-w-sm mb-10">
        The page you&apos;re looking for has been remixed out of existence.
        Maybe it dropped a beat and never recovered.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#2D8B5E] hover:bg-[#3DAF76] text-[#0A0908] text-sm font-semibold rounded-lg transition-colors"
      >
        <Home className="w-4 h-4" />
        Return to HOLLY
      </Link>
    </div>
  );
}
