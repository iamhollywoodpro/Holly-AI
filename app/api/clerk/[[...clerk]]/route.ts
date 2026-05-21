/**
 * Clerk API + JS Proxy
 *
 * Routes ALL Clerk traffic through Holly's own domain, bypassing the broken
 * TLS certificate on clerk.holly.nexamusicgroup.com.
 *
 * THE PROBLEM:
 *   The publishable key encodes 'clerk.holly.nexamusicgroup.com' as the Frontend API.
 *   That subdomain is on Cloudflare but has NO valid SSL certificate —
 *   every TLS handshake fails with "SSLv3 alert handshake failure".
 *   Browsers refuse to connect → ALL Clerk auth calls AND the JS bundle fail.
 *
 * THE FIX (server-side SNI override):
 *   clerk.clerk.com and clerk.holly.nexamusicgroup.com resolve to the same
 *   Cloudflare infrastructure, but only clerk.clerk.com has a valid cert.
 *   We connect using clerk.clerk.com as the TLS hostname (SNI), set the
 *   x-forwarded-host to clerk.holly.nexamusicgroup.com so Clerk identifies
 *   Holly's app, and inject __clerk_publishable_key for API routes.
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

// clerk.clerk.com has a valid TLS cert. clerk.holly.nexamusicgroup.com does not.
// Both are on the same Cloudflare infrastructure.
const CLERK_SNI_HOST = 'clerk.clerk.com';

// Holly's publishable key is read dynamically from env inside proxyToClerk()
// to extract the correct clerk domain for x-forwarded-host.

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
    const searchParams = req.nextUrl.searchParams.toString();
    const isNpmPath = path.startsWith('/npm/');
    const isApiPath = path.startsWith('/v1/') || path.startsWith('/v2/');
    const isSessionPath = path.includes('/sessions/');
    const isTouchPath = path.includes('/touch');

    const qsStr = searchParams;
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

    // Build forwarding headers
    const reqHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // Strip hop-by-hop and encoding headers; Clerk sends uncompressed when no accept-encoding
      if (
        !['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'].includes(
          lower
        )
      ) {
        reqHeaders[key] = value;
      }
    });

    // Route through clerk.clerk.com (valid cert) with Holly's domain as x-forwarded-host
    reqHeaders['host'] = CLERK_SNI_HOST;
    reqHeaders['origin'] = 'https://holly.nexamusicgroup.com';
    // CRITICAL: x-forwarded-host identifies Holly's Clerk app instance.
    // Must match the domain encoded in the publishable key.
    // Key format: pk_live_<base64-encoded-domain>$
    const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    let clerkDomain = 'clerk.nexamusicgroup.com'; // safe default
    try {
      const encoded = pk.replace(/^pk_(live|test)_/, '').replace(/\$$/, '');
      clerkDomain = Buffer.from(encoded, 'base64').toString('utf-8');
    } catch {}
    reqHeaders['x-forwarded-host'] = clerkDomain;
    reqHeaders['x-forwarded-proto'] = 'https';
    if (body) reqHeaders['content-length'] = String(body.byteLength);

    // For npm bundle requests, follow up to 3 redirects (307 → versioned URL)
    let currentPath = finalPath;
    let response = await httpsRequest(CLERK_SNI_HOST, currentPath, req.method, reqHeaders, body);

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
        // npm bundles don't need publishable key or x-forwarded-host
        const bundleHeaders: Record<string, string> = {
          host: CLERK_SNI_HOST,
          accept: '*/*',
        };
        response = await httpsRequest(CLERK_SNI_HOST, currentPath, 'GET', bundleHeaders);
        redirectCount++;
      }
    }

    // Build response headers
    const responseHeaders = new Headers();
    Object.entries(response.headers).forEach(([key, value]) => {
      const lower = key.toLowerCase();
      // Strip hop-by-hop headers; pass everything else including content-encoding
      if (!['transfer-encoding', 'connection'].includes(lower) && value) {
        if (Array.isArray(value)) {
          value.forEach(v => {
            // CRITICAL PROXY FIX: 
            // Clerk's backend sets `Domain=clerk.holly.nexamusicgroup.com` because
            // we sent `x-forwarded-host: clerk.holly.nexamusicgroup.com`.
            // The browser is at `holly.nexamusicgroup.com` and STRICTLY REJECTS 
            // the cookie because a parent domain cannot set a subdomain cookie.
            // We must rewrite the domain to the app's root domain, or strip it.
            let cleanCookie = v;
            if (lower === 'set-cookie') {
              cleanCookie = cleanCookie.replace(/Domain=[^;]+/i, 'Domain=holly.nexamusicgroup.com');
            }
            
            if (Object.prototype.toString.call(responseHeaders) === '[object Headers]') {
              responseHeaders.append(key, cleanCookie);
            } else {
              responseHeaders.set(key, cleanCookie);
            }
          });
        } else {
          let cleanCookie = value;
          if (lower === 'set-cookie') {
            cleanCookie = cleanCookie.replace(/Domain=[^;]+/i, 'Domain=holly.nexamusicgroup.com');
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
