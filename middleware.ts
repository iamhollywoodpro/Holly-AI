/**
 * HOLLY AI — Middleware (Sign-In Loop Fix v3)
 *
 * ROOT CAUSE OF SIGN-IN LOOPS:
 *   1. User signs in → Clerk client SDK immediately sets __client_uat and says "signed in"
 *   2. Sign-in page detects isSignedIn → redirects to /chat
 *   3. Middleware runs auth() on the server → __session cookie not set yet → no userId
 *   4. Middleware redirects BACK to /sign-in
 *   5. Clerk client says "still signed in!" → redirects to /chat → LOOP
 *
 * FIX (two layers):
 *   Layer 1 (middleware): When auth() says "no user" but __client_uat cookie exists,
 *     the user JUST signed in and the session is propagating. Return a "loading" page
 *     that retries after 2 seconds instead of redirecting to sign-in.
 *   Layer 2 (sign-in page): After detecting isSignedIn, use window.location.href (hard
 *     navigation) with a delay, NOT router.replace (soft navigation which races).
 *
 * Uses clerkMiddleware as default export. Auth checking uses auth() (reads __session
 * JWT locally, zero network calls).
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
// PUBLIC ROUTES
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
// SESSION LOADING PAGE — returned when client says "signed in" but server
// hasn't received the __session cookie yet. Prevents redirect loop.
// ─────────────────────────────────────────────────────────────────────────────
function sessionLoadingResponse(targetPath: string): NextResponse {
  const safePath = targetPath.startsWith('/') ? targetPath : '/chat';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HOLLY — Establishing Connection...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #050508;
      color: #fff;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .orb {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #a855f7, #6366f1);
      animation: pulse 1.5s ease-in-out infinite;
      box-shadow: 0 0 40px rgba(168, 85, 247, 0.3);
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 1; }
    }
    h2 {
      margin-top: 24px;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    p {
      margin-top: 8px;
      font-size: 13px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="orb"></div>
  <h2>Establishing Connection...</h2>
  <p>Holly is syncing your session</p>
  <script>
    // Hard redirect after 2 seconds — by then the __session cookie should be set
    setTimeout(function() {
      window.location.replace("${safePath}");
    }, 2000);
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Don't cache this transitional page
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
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

  // ── PUBLIC ROUTES ──────────────────────────────────────────────────────
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // ── PROTECTED ROUTES ───────────────────────────────────────────────────
  const { userId } = await auth();

  if (userId) {
    return NextResponse.next();
  }

  // ── SIGN-IN LOOP PREVENTION ────────────────────────────────────────────
  // Clerk sets __client_uat immediately when the client SDK detects a session.
  // The __session JWT cookie takes a moment to propagate through the proxy.
  // If __client_uat exists but auth() returned no userId, the user JUST signed in
  // and the session is still propagating. Return a loading page instead of
  // redirecting to /sign-in (which causes the loop).
  const clientUat = req.cookies.get('__client_uat')?.value;
  if (clientUat && clientUat !== '0') {
    console.log(`[HOLLY MW] Session race detected: __client_uat=${clientUat} but no userId. Showing loading page for ${pathname}`);
    return sessionLoadingResponse(pathname);
  }

  // Not authenticated at all — redirect to sign-in
  const signInUrl = new URL('/sign-in', PUBLIC_ORIGIN);
  const redirectPath = sanitizeUrl(req.url);
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
