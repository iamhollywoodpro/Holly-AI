/**
 * Clerk API + JS Proxy
 *
 * Routes ALL Clerk traffic through Holly's own domain.
 *
 * HOW IT WORKS (v2 — fixed 2025-05):
 *   1. We connect to clerk.clerk.com for TLS (valid certificate).
 *   2. The publishable key (pk) is injected into every API request's query
 *      string so Clerk can identify the app instance. This replaces the old
 *      x-forwarded-host approach which Clerk's API no longer accepts.
 *   3. The origin header is stripped/rewritten to prevent Clerk from rejecting
 *      requests with "origin_invalid".
 *   4. Cookie domains are rewritten to holly.nexamusicgroup.com.
 *
 * WHAT THIS PROXY HANDLES:
 *   /api/clerk/v1/*          → Clerk auth API (sign-in, tokens, sessions, etc.)
 *   /api/clerk/npm/*         → Clerk JS bundle (clerk.browser.js v5 + chunks)
 *   /api/clerk/...           → any other Clerk endpoint
 *
 * HOW CLERK JS LOADS (with proxyUrl set in ClerkProvider):
 *   @clerk/nextjs v5 builds script URL as:
 *     https://holly.nexamusicgroup.com/api/clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js
 *   This proxy follows the 307 redirect from clerk.clerk.com to the exact
 *   versioned URL and streams the correct v5 bundle back to the browser.
 *   DO NOT set clerkJSUrl in ClerkProvider — it would serve a wrong/stale file.
 *
 * ClerkProvider must be configured with ONLY:
 *   proxyUrl="https://holly.nexamusicgroup.com/api/clerk"
 */

import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// clerk.clerk.com has a valid TLS cert that we use for the HTTPS connection.
const CLERK_SNI_HOST = 'clerk.clerk.com';

export async function GET(req: NextRequest, { params }: { params: { clerk?: string[] } }) {
  return proxyToClerk(req, params.clerk);
}

export async function POST(req: NextRequest, { params }: { params: { clerk?: string[] } }) {
  return proxyToClerk(req, params.clerk);
}

export async function PUT(req: NextRequest, { params }: { params: { clerk?: string[] } }) {
  return proxyToClerk(req, params.clerk);
}

export async function PATCH(req: NextRequest, { params }: { params: { clerk?: string[] } }) {
  return proxyToClerk(req, params.clerk);
}

export async function DELETE(req: NextRequest, { params }: { params: { clerk?: string[] } }) {
  return proxyToClerk(req, params.clerk);
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Requested-With, __clerk_api_version',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Make a single HTTPS request and return raw response + body
function httpsRequest(
  hostname: string,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<{ statusCode: number; headers: Record<string, string | string[]>; data: Buffer }> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname,
      port: 443,
      path,
      method,
      headers,
    };

    const chunks: Buffer[] = [];
    const req = https.request(options, (res) => {
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers as Record<string, string | string[]>,
          data: Buffer.concat(chunks),
        })
      );
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Clerk proxy timeout'));
    });

    if (body) req.write(body);
    req.end();
  });
}

async function proxyToClerk(req: NextRequest, pathSegments?: string[]): Promise<NextResponse> {
  try {
    const path = pathSegments ? '/' + pathSegments.join('/') : '/';
    const searchParams = req.nextUrl.searchParams;
    const isNpmPath = path.startsWith('/npm/');
    const isApiPath = path.startsWith('/v1/') || path.startsWith('/v2/');
    const isSessionPath = path.includes('/sessions/');
    const isTouchPath = path.includes('/touch');

    // Publishable key — needed to identify the Clerk instance to Clerk's API.
    // Priority: runtime env var → build-time fallback (baked into client bundle).
    // Coolify's compose can override with empty string, so we keep a hardcoded
    // fallback. This key is PUBLIC (visible in browser HTML) — not a secret.
    const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      || 'pk_live_Y2xlcmsuaG9sbHkubmV4YW11c2ljZ3JvdXAuY29tJA';
    const appDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'holly.nexamusicgroup.com';

    // ── For API GET requests: inject the publishable key into the query string ──
    // This is how Clerk identifies the app instance on initial sync (GET /v1/client).
    // IMPORTANT: Only inject pk for GET/HEAD requests. Clerk REJECTS pk as a query
    // parameter on POST/PUT/PATCH/DELETE with 422 "form_param_unknown". For write
    // requests, Clerk identifies the instance via cookies set during the initial
    // GET /v1/client sync (which happens on page load, before sign-in).
    if (isApiPath && pk && (req.method === 'GET' || req.method === 'HEAD')) {
      if (!searchParams.has('pk')) {
        searchParams.set('pk', pk);
      }
    }

    // ── Strip redirect_url from API query params ────────────────────────────
    // Clerk validates redirect_url against the instance's configured domains.
    // holly.nexamusicgroup.com is "Pending" (not verified) in Clerk Dashboard,
    // so Clerk returns 422 "redirect_url does not match allowed values".
    //
    // We handle ALL redirects client-side (window.location.href in sign-in and
    // sign-up pages), so this parameter is NOT needed by Clerk's backend.
    // Stripping it prevents the validation error entirely.
    if (isApiPath) {
      searchParams.delete('redirect_url');
    }

    const qsStr = searchParams.toString();
    let finalPath = qsStr ? `${path}?${qsStr}` : path;

    // Log session touch calls to help debug auth issues
    if (isSessionPath && isTouchPath) {
      const cookieHeader = req.headers.get('cookie') || '';
      const hasSessionCookie = cookieHeader.includes('__session') || cookieHeader.includes('__clerk');
      console.log(`[HOLLY] Session touch proxy: ${path} | cookies=${hasSessionCookie ? 'present' : 'MISSING'} | method=${req.method}`);
    }

    let body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? Buffer.from(await req.arrayBuffer())
        : undefined;

    // ── Strip redirect_url from JSON request bodies ──────────────────────
    // Same reason as query params above — Clerk validates redirect_url in
    // sign_ins, sign_ups, and other POST bodies against allowed domains.
    if (body && isApiPath) {
      try {
        const parsed = JSON.parse(body.toString('utf-8'));
        if ('redirect_url' in parsed) {
          delete parsed.redirect_url;
          body = Buffer.from(JSON.stringify(parsed));
        }
      } catch {
        // Not JSON body — leave as-is (form-encoded, binary, etc.)
      }
    }

    // ── Build forwarding headers ──────────────────────────────────────────
    const reqHeaders: Record<string, string> = {
      host: CLERK_SNI_HOST,
      accept: req.headers.get('accept') || '*/*',
    };

    // ── Clerk-required proxy headers (API paths only) ──────────────────────
    // Clerk's Frontend API requires these three headers to authenticate
    // proxy requests. Without Clerk-Secret-Key, POST requests (sign_ins,
    // sign_ups) fail with 422 because Clerk can't verify the proxy is
    // authorized to make write requests on behalf of the instance.
    //
    // Reference: https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi
    if (isApiPath) {
      reqHeaders['Clerk-Proxy-Url'] = `https://${appDomain}/api/clerk`;
      reqHeaders['Clerk-Secret-Key'] = process.env.CLERK_SECRET_KEY || '';
      reqHeaders['X-Forwarded-For'] =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        req.ip ||
        'unknown';
    }

    // Forward cookies (needed for session management)
    const cookie = req.headers.get('cookie');
    if (cookie) reqHeaders['cookie'] = cookie;

    // Forward content-type for POST/PUT/PATCH requests
    if (body) {
      const ct = req.headers.get('content-type');
      if (ct) reqHeaders['content-type'] = ct;
      reqHeaders['content-length'] = String(body.byteLength);
    }

    // ── Execute request ───────────────────────────────────────────────────
    let currentPath = finalPath;
    let response = await httpsRequest(CLERK_SNI_HOST, currentPath, req.method, reqHeaders, body);

    // For npm bundle requests, follow up to 5 redirects (307 → versioned URL)
    if (isNpmPath) {
      let redirectCount = 0;
      while (
        (response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 307 ||
          response.statusCode === 308) &&
        redirectCount < 5
      ) {
        const location = response.headers['location'] as string;
        if (!location) break;

        // Extract path from redirect URL (may be absolute)
        let redirectPath: string;
        try {
          const redirectUrl = new URL(location);
          redirectPath = redirectUrl.pathname + (redirectUrl.search || '');
        } catch {
          // Relative redirect
          redirectPath = location;
        }

        console.log(`[HOLLY] Clerk npm redirect ${response.statusCode}: ${currentPath} → ${redirectPath}`);
        currentPath = redirectPath;
        const bundleHeaders: Record<string, string> = {
          host: CLERK_SNI_HOST,
          accept: '*/*',
        };
        response = await httpsRequest(CLERK_SNI_HOST, currentPath, 'GET', bundleHeaders);
        redirectCount++;
      }
    }

    // ── Build response headers ────────────────────────────────────────────
    const responseHeaders = new Headers();
    Object.entries(response.headers).forEach(([key, value]) => {
      const lower = key.toLowerCase();
      // Strip hop-by-hop headers
      if (!['transfer-encoding', 'connection', 'content-encoding'].includes(lower) && value) {
        if (Array.isArray(value)) {
          value.forEach(v => {
            // Rewrite cookie domains to the app domain.
            // Clerk sets Domain=<clerk-domain> which the browser rejects
            // because the request came from holly.nexamusicgroup.com.
            let cleanCookie = v;
            if (lower === 'set-cookie') {
              cleanCookie = cleanCookie.replace(/Domain=[^;]+/i, `Domain=${appDomain}`);
            }
            responseHeaders.append(key, cleanCookie);
          });
        } else {
          let cleanCookie = value;
          if (lower === 'set-cookie') {
            cleanCookie = cleanCookie.replace(/Domain=[^;]+/i, `Domain=${appDomain}`);
          }
          responseHeaders.set(key, cleanCookie);
        }
      }
    });

    // Cache npm bundles aggressively (they're versioned/immutable)
    if (isNpmPath && response.statusCode === 200) {
      responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    return new NextResponse(response.data as unknown as BodyInit, {
      status: response.statusCode,
      headers: responseHeaders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[HOLLY] Clerk proxy error:', msg);
    return NextResponse.json({ error: 'Clerk proxy error', message: msg }, { status: 502 });
  }
}
