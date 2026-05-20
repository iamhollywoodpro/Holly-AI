/**
 * HOLLY AI — Middleware
 *
 * Uses clerkMiddleware as the default export with custom logic in the callback.
 * Auth checking uses auth() (reads __session JWT locally, zero network calls)
 * instead of auth.protect() which triggers internal /clerk_XXXXX rewrites that
 * break in Docker when the Clerk FAPI domain has SSL issues.
 *
 * For protected routes without a valid session, we do a simple 302 redirect
 * to /sign-in — no internal rewrite dance, no proxying Clerk nonce paths.
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkEndpointRateLimit, getRateLimitHeaders } from '@/lib/security/endpoint-limiter';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION DOMAIN — used to sanitize Docker-internal URLs
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
// PUBLIC ROUTES — never require authentication
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

// Paths that bypass ALL middleware logic (health checks must always work)
const BYPASS_PATHS = new Set(['/api/health', '/api/metrics', '/api/version']);

// ─────────────────────────────────────────────────────────────────────────────
// URL SANITIZATION — replace Docker-internal origins with the real public domain
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

function sanitizeClerkRedirectResponse(
  response: NextResponse | Response,
): NextResponse | Response {
  const location = response.headers.get('location');
  if (!location) return response;

  let cleanLocation = sanitizeUrl(location);

  try {
    const locationUrl = new URL(cleanLocation, PUBLIC_ORIGIN);
    const redirectParam = locationUrl.searchParams.get('redirect_url');
    const sanitized = sanitizeRedirectUrl(redirectParam);

    if (redirectParam && sanitized !== redirectParam) {
      if (sanitized) {
        locationUrl.searchParams.set('redirect_url', sanitized);
      } else {
        locationUrl.searchParams.delete('redirect_url');
      }
      cleanLocation = locationUrl.toString();
    }
  } catch {}

  if (cleanLocation === location) return response;

  const newResponse = new NextResponse(null, {
    status: (response as Response).status,
    headers: new Headers(response.headers),
  });
  newResponse.headers.set('location', cleanLocation);
  return newResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE — clerkMiddleware as default export
// ─────────────────────────────────────────────────────────────────────────────
export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Hard bypass: health checks must always work regardless of Clerk state
  if (BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // ── Per-Endpoint Rate Limiting ──────────────────────────────────────────
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

  // ── PUBLIC ROUTES: pass through, no auth required ──────────────────────
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // ── PROTECTED ROUTES: check session via auth() ─────────────────────────
  // auth() reads the __session JWT cookie and verifies it locally using
  // CLERK_SECRET_KEY — zero network calls, no /clerk_XXXXX rewrites.
  const { userId } = await auth();

  if (userId) {
    // Authenticated — pass through
    return NextResponse.next();
  }

  // Not authenticated — redirect to sign-in with a sanitized redirect_url
  const signInUrl = new URL('/sign-in', PUBLIC_ORIGIN);
  const redirectPath = sanitizeUrl(req.url);
  // Only set redirect_url if it's a meaningful path (not just the home page)
  if (redirectPath !== PUBLIC_ORIGIN + '/' && redirectPath !== PUBLIC_ORIGIN) {
    signInUrl.searchParams.set('redirect_url', redirectPath);
  }

  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
