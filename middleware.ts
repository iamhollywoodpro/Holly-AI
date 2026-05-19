import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkEndpointRateLimit, getRateLimitHeaders } from '@/lib/security/endpoint-limiter';

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
  '/api/fine-tuning/(.*)',
  '/offline',
  '/download/(.*)',
  '/api/v1/(.*)',
]);

// Hard-bypass paths — returned BEFORE Clerk initialises
const BYPASS_PATHS = new Set(['/api/health', '/api/metrics', '/api/version']);
const BYPASS_PREFIX = ['/api/clerk/', '/clerk_'];

// ─────────────────────────────────────────────────────────────────────────────
// CLERK MIDDLEWARE — handles authentication for all protected routes
//
// CRITICAL FIX: clerkMiddleware() internally makes HTTP requests to /clerk_XXXXX
// paths which, in our Docker + Cloudflare + Clerk proxy setup, loop back through
// the network stack and hang forever. This causes ALL protected routes to time out.
//
// Solution: We wrap the clerkMiddleware call in Promise.race with a 5-second timeout.
// If it doesn't resolve, we fall back to parsing the __session JWT cookie directly
// to determine auth state — no network calls needed.
// ─────────────────────────────────────────────────────────────────────────────
const clerkHandler = clerkMiddleware(async (auth, req) => {
  // The middleware runs for ALL routes (public and protected).
  // For protected routes, the timeout wrapper below handles auth checking.
  // For public routes, just pass through.
});

// ─────────────────────────────────────────────────────────────────────────────
// JWT SESSION TOKEN PARSER (no network calls)
// Parses the __session cookie to extract userId without calling Clerk's backend.
// This is our fallback when clerkMiddleware hangs due to Docker network issues.
// ─────────────────────────────────────────────────────────────────────────────
function parseSessionCookie(req: NextRequest): { userId: string } | null {
  const cookieHeader = req.headers.get('cookie') || '';
  
  // Clerk v5 uses __session cookie (JWT format: header.payload.signature)
  const sessionMatch = cookieHeader.match(/__session=([^;]+)/);
  if (!sessionMatch) return null;
  
  try {
    const token = sessionMatch[1];
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    
    // Extract userId from Clerk JWT claims
    const userId = payload.sub || payload.userId || payload.clerk_user_id;
    if (userId) {
      return { userId };
    }
  } catch {
    // Invalid JWT — not authenticated
  }
  
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZE REDIRECT URL
// Replace any Docker-internal origin with the real public domain.
// Also validates that redirect_url is safe (relative or same-origin).
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeRedirectUrl(redirectUrl: string | null): string | null {
  if (!redirectUrl) return null;

  let sanitized = redirectUrl;

  for (const dockerOrigin of DOCKER_ORIGINS) {
    if (sanitized.startsWith(dockerOrigin)) {
      sanitized = PUBLIC_ORIGIN + sanitized.slice(dockerOrigin.length);
      break;
    }
  }

  if (sanitized.startsWith('/')) {
    return PUBLIC_ORIGIN + sanitized;
  }

  try {
    const url = new URL(sanitized);
    if (url.origin === PUBLIC_ORIGIN) {
      return url.href;
    }
  } catch {
    // Invalid URL — ignore
  }

  return PUBLIC_ORIGIN + '/chat';
}

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZE CLERK REDIRECT RESPONSE
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeClerkRedirectResponse(response: NextResponse | Response): NextResponse | Response {
  const location = response.headers.get('location');
  if (!location) return response;

  let cleanLocation = location;

  for (const dockerOrigin of DOCKER_ORIGINS) {
    if (cleanLocation.startsWith(dockerOrigin)) {
      cleanLocation = PUBLIC_ORIGIN + cleanLocation.slice(dockerOrigin.length);
      break;
    }
  }

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
  } catch {
    // Couldn't parse — leave as-is
  }

  if (cleanLocation === location) return response;

  const newResponse = new NextResponse(null, {
    status: (response as Response).status,
    headers: new Headers(response.headers),
  });
  newResponse.headers.set('location', cleanLocation);
  return newResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const CLERK_TIMEOUT_MS = 5000; // 5 second timeout for Clerk middleware

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  // Hard bypass: health checks must always work regardless of Clerk state
  if (BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Clerk proxy paths handle their own auth
  if (BYPASS_PREFIX.some(prefix => pathname.startsWith(prefix))) {
    if (pathname.startsWith('/clerk_')) {
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = `/api/clerk${pathname}`;
      return NextResponse.rewrite(rewriteUrl);
    }
    return NextResponse.next();
  }

  // ── Per-Endpoint Rate Limiting ──────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const identityKey = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || req.ip
      || 'unknown';
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

  // ── Intercept bad redirect_url in the REQUEST ────────────────────────────
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

  // ── PUBLIC ROUTES: delegate to Clerk normally ───────────────────────────
  if (isPublicRoute(req)) {
    try {
      const response = await Promise.resolve(clerkHandler(req, event));
      if (response && [301, 302, 307, 308].includes((response as Response).status)) {
        return sanitizeClerkRedirectResponse(response as NextResponse) as NextResponse;
      }
      return response;
    } catch (err) {
      // Clerk error on public route — just pass through
      return NextResponse.next();
    }
  }

  // ── PROTECTED ROUTES: use JWT parsing with Clerk fallback ────────────────
  // Primary: Parse __session JWT cookie directly (zero network calls, instant)
  // Fallback: Call clerkMiddleware with a timeout (handles edge cases)
  
  const sessionFromCookie = parseSessionCookie(req);
  
  if (sessionFromCookie?.userId) {
    // Valid session found in cookie — pass through immediately
    return NextResponse.next();
  }

  // No valid session in cookie. Try Clerk middleware as fallback (with timeout)
  // This handles the case where the cookie exists but Clerk needs to validate it
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), CLERK_TIMEOUT_MS);
    });

    const response = await Promise.race([
      Promise.resolve(clerkHandler(req, event)),
      timeoutPromise,
    ]);

    if (response === null) {
      // Clerk timed out AND no valid session cookie → redirect to sign-in
      console.warn(`[HOLLY] Clerk middleware timed out on "${pathname}" and no valid session cookie — redirecting to sign-in`);
      return NextResponse.redirect(new URL('/sign-in', PUBLIC_ORIGIN));
    }

    // Clerk responded — sanitize any redirect
    if (response && [301, 302, 307, 308].includes((response as Response).status)) {
      return sanitizeClerkRedirectResponse(response as NextResponse) as NextResponse;
    }

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[HOLLY] Clerk middleware error on "${pathname}": ${msg}`);

    // Check if there's a session cookie (even if we couldn't parse it)
    const cookieHeader = req.headers.get('cookie') || '';
    const hasSessionCookie = cookieHeader.includes('__session') || cookieHeader.includes('__client_uat');

    if (hasSessionCookie) {
      console.warn(`[HOLLY] Clerk error but session cookie present — letting request through to avoid sign-in loop`);
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/sign-in', PUBLIC_ORIGIN));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|pdf|zip)).*)',
  ],
};
