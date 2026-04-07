import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
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
  '/clerk.browser.js',          // Clerk JS bundle served locally — must be public
  '/api/clerk/(.*)',            // Clerk API proxy — must be public (handles its own auth)
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
// clerk.browser.js is served from /public and must be publicly accessible
// so the sign-in page can load Clerk without an external CDN dependency.
// ─────────────────────────────────────────────────────────────────────────────
const BYPASS_PATHS = new Set(['/api/health', '/api/version', '/clerk.browser.js']);
// Also bypass all /api/clerk/* paths (Clerk proxy — handles its own auth)
const BYPASS_PREFIX = ['/api/clerk/'];

// ─────────────────────────────────────────────────────────────────────────────
// CLERK MIDDLEWARE
//
// Clerk v5 change: `auth` is already the auth object — use `auth.protect()`
// NOT `auth().protect()` (which was Clerk v4 syntax and causes crashes).
// ─────────────────────────────────────────────────────────────────────────────
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Clerk v5: call protect() on auth directly (no parentheses)
    await auth.protect();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest) {
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
    return await Promise.resolve(clerkHandler(req));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[HOLLY] Clerk middleware error on "${pathname}": ${msg}`);

    if (isPublicRoute(req)) {
      // Let public pages render even without auth (degraded mode)
      return NextResponse.next();
    }

    // Redirect protected routes to sign-in instead of crashing with 500
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals, static files, and clerk chunk files
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|clerk\\.browser\\.js|.*_clerk\\.browser_.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
