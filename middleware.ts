/**
 * HOLLY AI — Middleware
 *
 * MINIMAL middleware — only handles rate limiting.
 * NO auth checks here. Each API route handles its own auth via Clerk's auth().
 * NO page redirects here. Each page handles its own auth client-side.
 *
 * Previous sign-in loops were caused by middleware-level auth checks
 * conflicting with Clerk's proxy-based session management.
 */
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkEndpointRateLimit, getRateLimitHeaders } from '@/lib/security/endpoint-limiter';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE — rate limiting only
// ─────────────────────────────────────────────────────────────────────────────
export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // ── Per-Endpoint Rate Limiting (all API routes) ────────────────────────
  if (pathname.startsWith('/api/')) {
    const identityKey =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.ip ||
      'unknown';
    const rateResult = checkEndpointRateLimit(pathname, identityKey);

    if (!rateResult.allowed) {
      const headers = getRateLimitHeaders(rateResult);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          category: rateResult.category,
          retryAfter: Math.ceil(rateResult.retryAfterMs / 1000) + 's',
        },
        { status: 429, headers },
      );
    }
  }

  // ── ALL ROUTES: pass through ─────────────────────────────────────────
  // Auth is handled by each route individually.
  // Pages use Clerk's client-side hooks (useAuth/useUser).
  // API routes call auth() directly in their handlers.
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
