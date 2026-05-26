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

    const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    const appDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'holly.nexamusicgroup.com';

    // ── For API paths: inject the publishable key into the query string ──
    // This is how Clerk identifies the app instance when using a proxy.
    // The old x-forwarded-host approach stopped working — Clerk returns
    // "host_invalid" without the pk parameter.
    if (isApiPath && pk) {
      if (!searchParams.has('pk')) {
        searchParams.set('pk', pk);
      }
      // Also fix __clerk_api_version if set to bare "5" — Clerk expects a
      // date-based version like "2024-10-01". If Clerk JS sends "5" we leave
      // it (Clerk's backend accepts it when pk is present), but we rewrite
      // the version that was previously causing "api_version_invalid".
      const apiVer = searchParams.get('__clerk_api_version');
      if (apiVer === '5') {
        // Clerk JS v5 uses the numeric version — leave it. The pk param
        // is what makes it work now.
      }
    }

    const qsStr = searchParams.toString();
    let finalPath = qsStr ? `${path}?${qsStr}` : path;

    // Log session touch calls to help debug auth issues
    if (isSessionPath && isTouchPath) {
      const cookieHeader = req.headers.get('cookie') || '';
      const hasSessionCookie = cookieHeader.includes('__session') || cookieHeader.includes('__clerk');
      console.log(`[HOLLY] Session touch proxy: ${path} | cookies=${hasSessionCookie ? 'present' : 'MISSING'} | method=${req.method}`);
    }

    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? Buffer.from(await req.arrayBuffer())
        : undefined;

    // ── Build forwarding headers ──────────────────────────────────────────
    const reqHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // Strip hop-by-hop headers, encoding headers, AND the origin header.
      // The origin header from the browser says holly.nexamusicgroup.com but
      // clerk.clerk.com rejects it as "origin_invalid" because the request
      // URL is clerk.clerk.com. We omit it entirely — Clerk doesn't require
      // origin on server-to-server proxied requests.
      if (
        !['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding', 'origin'].includes(
          lower
        )
      ) {
        reqHeaders[key] = value;
      }
    });

    // Set the host to clerk.clerk.com (the TLS SNI host)
    reqHeaders['host'] = CLERK_SNI_HOST;
    // Don't send x-forwarded-host — it causes "host_invalid" with Clerk's
    // current API. The pk query parameter handles app identification.
    if (body) reqHeaders['content-length'] = String(body.byteLength);

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
