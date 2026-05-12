import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent } from 'next/server';
import type { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION DOMAIN — used to sanitize Docker-internal URLs
// Inside Docker, req.url resolves to http://0.0.0.0:3000. When Clerk's
// auth.protect() redirects to /sign-in?redirect_url=<original>, it bakes in
// the 0.0.0.0 URL. Clerk then rejects it (422) as an invalid redirect origin.
// We rewrite all 0.0.0.0 / localhost references to the real public domain.
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
  '/offline',
  '/download/(.*)',
  '/api/v1/(.*)',
]);

// Hard-bypass paths — returned BEFORE Clerk initialises
const BYPASS_PATHS = new Set(['/api/health', '/api/metrics', '/api/version']);
const BYPASS_PREFIX = ['/api/clerk/'];

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZE REDIRECT URL
// Replace any Docker-internal origin with the real public domain.
// Also validates that redirect_url is safe (relative or same-origin).
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeRedirectUrl(redirectUrl: string | null): string | null {
  if (!redirectUrl) return null;

  let sanitized = redirectUrl;

  // Replace Docker/localhost origins with the public domain
  for (const dockerOrigin of DOCKER_ORIGINS) {
    if (sanitized.startsWith(dockerOrigin)) {
      sanitized = PUBLIC_ORIGIN + sanitized.slice(dockerOrigin.length);
      break;
    }
  }

  // Convert relative paths to absolute URLs using our public origin.
  // This is CRITICAL: because we proxy Clerk behind clerk.holly.nexamusicgroup.com,
  // Clerk evaluates relative URLs against the proxy domain instead of the app domain.
  // Clerk then rejects relative URLs because it doesn't recognize the proxy domain
  // as the allowed redirect destination.
  if (sanitized.startsWith('/')) {
    return PUBLIC_ORIGIN + sanitized;
  }

  // If it's an absolute URL, ensure it's our domain
  try {
    const url = new URL(sanitized);
    if (url.origin === PUBLIC_ORIGIN) {
      return url.href; // Return full absolute URL, not just pathname
    }
  } catch {
    // Invalid URL — ignore
  }

  // Anything else is unsafe — discard it and fallback to absolute default
  return PUBLIC_ORIGIN + '/chat';
}

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZE CLERK REDIRECT RESPONSE
// After Clerk returns a redirect, fix any 0.0.0.0 URLs in the Location header
// and the redirect_url query parameter before it reaches the browser.
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeClerkRedirectResponse(response: NextResponse | Response): NextResponse | Response {
  const location = response.headers.get('location');
  if (!location) return response;

  let cleanLocation = location;

  // Fix Docker origins in Location header itself
  for (const dockerOrigin of DOCKER_ORIGINS) {
    if (cleanLocation.startsWith(dockerOrigin)) {
      cleanLocation = PUBLIC_ORIGIN + cleanLocation.slice(dockerOrigin.length);
      break;
    }
  }

  // Fix redirect_url query parameter inside the Location value
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

    // If no redirect_url was in the param, still check if redirect_url is missing
    // and we're going to /sign-in — strip redirect_url entirely to avoid loops
    if (locationUrl.pathname.startsWith('/sign-in')) {
      const rawParam = locationUrl.searchParams.get('redirect_url');
      if (!rawParam) {
        // Fine — no redirect_url, no loop
      }
    }
  } catch {
    // Couldn't parse — leave as-is
  }

  if (cleanLocation === location) return response; // Nothing changed

  // Build a new response with the clean Location header
  const newResponse = new NextResponse(null, {
    status: (response as Response).status,
    headers: new Headers(response.headers),
  });
  newResponse.headers.set('location', cleanLocation);
  return newResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLERK MIDDLEWARE — handles authentication for all protected routes
// ─────────────────────────────────────────────────────────────────────────────
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Defensive: handle both Clerk v4 (callable) and v5 (object) API shapes
    const authResolved = (typeof auth === 'function'
      ? (auth as unknown as () => unknown)()
      : auth) as { protect?: (...args: unknown[]) => unknown } | null;

    if (typeof authResolved?.protect === 'function') {
      await authResolved.protect();
    } else {
      console.warn('[HOLLY] Clerk auth.protect() unavailable — shape:', typeof auth);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  // Hard bypass: health checks must always work regardless of Clerk state
  if (BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Clerk proxy paths handle their own auth
  if (BYPASS_PREFIX.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // ── Intercept any incoming 0.0.0.0 redirect_url in the REQUEST ────────────
  // If the browser arrives at /sign-in?redirect_url=https://0.0.0.0:...
  // rewrite the URL before it even hits Clerk, so Clerk never sees the bad URL.
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

  // ── Delegate to Clerk ──────────────────────────────────────────────────────
  try {
    const response = await Promise.resolve(clerkHandler(req, event));

    // Sanitize any redirect response from Clerk — fix 0.0.0.0 in Location header
    // This catches the case where auth.protect() builds redirect_url from req.url
    // (which is 0.0.0.0:3000 inside Docker) and puts it in the Location header.
    if (response && [301, 302, 307, 308].includes((response as Response).status)) {
      return sanitizeClerkRedirectResponse(response as NextResponse) as NextResponse;
    }

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[HOLLY] Clerk middleware error on "${pathname}": ${msg}`);

    if (isPublicRoute(req)) {
      return NextResponse.next();
    }

    // Redirect to sign-in WITHOUT redirect_url — the 0.0.0.0 URL would
    // poison the sign-in flow and cause a 422 → infinite loop.
    // ClerkProvider has forceRedirectUrl="/chat" which handles post-login nav.
    return NextResponse.redirect(new URL('/sign-in', PUBLIC_ORIGIN));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
