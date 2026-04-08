import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent } from 'next/server';
import type { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES — never require authentication
// ─────────────────────────────────────────────────────────────────────────────
const isPublicRoute = createRouteMatcher([
  '/',                          // Landing page — always public
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/factor-two(.*)',            // Clerk MFA second-factor verification page
  '/api/webhooks/(.*)',         // Clerk + GitHub webhooks
  '/api/health',                // ⚠️ CRITICAL: Docker/Coolify/Traefik health probe
  '/api/version',               // Public diagnostic endpoint
  '/api/clerk/(.*)',            // Clerk API + JS bundle proxy — must be public
  '/offline',
  '/download/(.*)',
  '/api/v1/(.*)',               // Public API — Bearer key auth
]);

// ─────────────────────────────────────────────────────────────────────────────
// HARD BYPASS PATHS
// These paths return NextResponse.next() BEFORE Clerk initialises.
// This guarantees /api/health always returns 200, even when Clerk is broken.
// Traefik polls this endpoint to decide if the container is healthy; a non-200
// response causes it to mark the container unhealthy → Gateway Timeout.
// ─────────────────────────────────────────────────────────────────────────────
const BYPASS_PATHS = new Set(['/api/health', '/api/version']);
// Also bypass all /api/clerk/* paths (Clerk proxy + JS bundle — handles its own auth)
const BYPASS_PREFIX = ['/api/clerk/'];

// ─────────────────────────────────────────────────────────────────────────────
// CLERK MIDDLEWARE
//
// Defensive implementation that handles both Clerk API shapes:
//
//   v5 (current):  auth is an object  → auth.protect()
//   v4 (legacy):   auth is a function → auth().protect()
//
// The "e.protect is not a function" error in production logs happens when
// @clerk/nextjs v5.7.x receives an auth object in the legacy callable form
// due to a version mismatch between @clerk/nextjs (5.7.5) and the clerk-js
// bundle version (5.125.7) served via the CDN proxy. This guard handles both.
// ─────────────────────────────────────────────────────────────────────────────
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Resolve auth to an object regardless of v4/v5 callable form.
    // Cast through unknown to avoid TS overlap errors between ClerkMiddlewareAuth
    // (which may be a callable in older runtime contexts) and the plain object form.
    const authResolved = (typeof auth === 'function'
      ? (auth as unknown as () => unknown)()
      : auth) as { protect?: (...args: unknown[]) => unknown } | null;

    if (typeof authResolved?.protect === 'function') {
      await authResolved.protect();
    } else {
      // Fallback: log and let Clerk handle the redirect naturally
      console.warn('[HOLLY] Clerk auth.protect() not available — shape:', typeof auth);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  // ── Hard bypass: health + version must always work ─────────────────────────
  if (BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }
  // Bypass Clerk proxy paths (they handle their own auth forwarding)
  if (BYPASS_PREFIX.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // ── Delegate to Clerk, catch any config errors gracefully ──────────────────
  // clerkHandler returns a Promise — await it so we can catch async errors.
  // This handles cases where CLERK_SECRET_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  // is missing at runtime (Coolify env vars not set), preventing a 500 crash.
  try {
    return await Promise.resolve(clerkHandler(req, event));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[HOLLY] Clerk middleware error on "${pathname}": ${msg}`);

    if (isPublicRoute(req)) {
      // Let public pages render even without auth (degraded mode)
      return NextResponse.next();
    }

    // Redirect protected routes to sign-in instead of crashing with 500.
    // Do NOT append ?redirect_url — inside Docker, req.url resolves to
    // http://0.0.0.0:3000/... which Clerk rejects as an invalid origin,
    // creating an infinite redirect loop back to /sign-in.
    const signInUrl = new URL('/sign-in', 'https://holly.nexamusicgroup.com');
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
