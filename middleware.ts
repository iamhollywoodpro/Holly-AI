/**
 * HOLLY AI — Middleware (Sign-In Loop Fix v4 — FINAL)
 *
 * PREVIOUS APPROACHES (v1-v3) ALL FAILED BECAUSE:
 *   Clerk's forceRedirectUrl causes a SERVER-SIDE 302 redirect to /chat.
 *   At that point, Clerk's client JS has NEVER run, so __client_uat is not set.
 *   The middleware sees no session AND no __client_uat, assumes "not authenticated",
 *   redirects to /sign-in → LOOP. No amount of client-side delays or cookie checks
 *   can fix this because the loop happens before client JS executes.
 *
 * FINAL FIX:
 *   ONLY guard API routes in middleware. Page routes are NEVER redirected server-side.
 *   Each page handles its own auth client-side using Clerk's useAuth()/useUser() hooks.
 *   This makes the sign-in loop IMPOSSIBLE because there is no server-side redirect
 *   to create a loop.
 *
 * Uses clerkMiddleware as default export.
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkEndpointRateLimit, getRateLimitHeaders } from '@/lib/security/endpoint-limiter';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION DOMAIN
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_ORIGIN = 'https://holly.nexamusicgroup.com';
const DOCKER_ORIGINS = [
  'http://0.0.0.0:3000',
  'https://0.0.0.0:3000',
  'http://0.0.0.0',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (used for reference, but pages are never redirected)
// ─────────────────────────────────────────────────────────────────────────────
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/factor-two(.*)',
  '/api/webhooks/(.*)',
  '/api/health',
  '/api/version',
  '/api/clerk/(.*)',
  '/api/fine-tuning/(.*)',
  '/offline',
  '/download/(.*)',
  '/api/v1/(.*)',
]);

const BYPASS_PATHS = new Set(['/api/health', '/api/metrics', '/api/version']);

// ─────────────────────────────────────────────────────────────────────────────
// URL SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeUrl(url: string): string {
  let clean = url;
  for (const dockerOrigin of DOCKER_ORIGINS) {
    if (clean.startsWith(dockerOrigin)) {
      clean = PUBLIC_ORIGIN + clean.slice(dockerOrigin.length);
      break;
    }
  }
  return clean;
}

function sanitizeRedirectUrl(redirectUrl: string | null): string | null {
  if (!redirectUrl) return null;
  const sanitized = sanitizeUrl(redirectUrl);
  if (sanitized.startsWith('/')) {
    return PUBLIC_ORIGIN + sanitized;
  }
  try {
    const parsed = new URL(sanitized);
    if (parsed.origin === PUBLIC_ORIGIN) return parsed.href;
  } catch {}
  return PUBLIC_ORIGIN + '/chat';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Hard bypass
  if (BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

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

    // ── API Route Auth Check ────────────────────────────────────────────
    // Public API routes (webhooks, health, clerk proxy) skip auth
    if (!isPublicRoute(req)) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }
    }
  }

  // ── Sanitize redirect_url on sign-in / sign-up pages ───────────────────
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    const redirectParam = req.nextUrl.searchParams.get('redirect_url');
    const sanitized = sanitizeRedirectUrl(redirectParam);

    if (redirectParam && sanitized !== redirectParam) {
      const cleanUrl = req.nextUrl.clone();
      if (sanitized && sanitized !== '/chat') {
        cleanUrl.searchParams.set('redirect_url', sanitized);
      } else {
        cleanUrl.searchParams.delete('redirect_url');
      }
      return NextResponse.redirect(cleanUrl);
    }
  }

  // ── ALL PAGE ROUTES: always pass through ─────────────────────────────
  // Pages handle their own auth client-side using Clerk's useAuth()/useUser().
  // This eliminates the server-side redirect loop that was causing sign-in failures.
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
