/**
 * HOLLY AI — Middleware
 *
 * Handles rate limiting for all routes. Auth is handled per-route/page.
 *
 * CRITICAL: /api/clerk/* routes must BYPASS clerkMiddleware entirely.
 * In @clerk/nextjs v5, clerkMiddleware intercepts Clerk API routes and
 * tries to handle them internally — but it doesn't inject the `pk` parameter
 * that our proxy needs to identify the Clerk instance. This causes Clerk to
 * return "host_invalid" (400), breaking all auth.
 *
 * Our custom proxy at app/api/clerk/[[...clerk]]/route.ts handles these
 * routes correctly by injecting the pk and forwarding to clerk.clerk.com.
 */
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkEndpointRateLimit, getRateLimitHeaders } from '@/lib/security/endpoint-limiter';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: rate limit check for any API route
// ─────────────────────────────────────────────────────────────────────────────
function checkRateLimit(pathname: string, req: NextRequest): NextResponse | null {
  if (!pathname.startsWith('/api/')) return null;

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

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// clerkMiddleware instance for non-Clerk routes
// ─────────────────────────────────────────────────────────────────────────────
const clerkMid = clerkMiddleware(async (_auth, req) => {
  const pathname = req.nextUrl.pathname;

  const rateLimited = checkRateLimit(pathname, req);
  if (rateLimited) return rateLimited;

  return NextResponse.next();
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE — conditionally bypasses clerkMiddleware for Clerk proxy
// ─────────────────────────────────────────────────────────────────────────────
export default function middleware(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
) {
  const pathname = req.nextUrl.pathname;

  // ── Clerk proxy routes: bypass clerkMiddleware entirely ────────────────
  // clerkMiddleware intercepts /api/clerk/* and makes its own internal
  // request to Clerk WITHOUT the pk parameter → host_invalid (400).
  // Our custom proxy route handles these correctly.
  if (pathname.startsWith('/api/clerk/')) {
    const rateLimited = checkRateLimit(pathname, req);
    if (rateLimited) return rateLimited;
    return NextResponse.next();
  }

  // ── All other routes: use clerkMiddleware ──────────────────────────────
  return clerkMid(req, event);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
