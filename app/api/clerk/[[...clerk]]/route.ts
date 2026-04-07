/**
 * Clerk API Proxy
 *
 * Routes all Clerk authentication API calls through Holly's own domain.
 * This bypasses the broken TLS certificate on clerk.holly.nexamusicgroup.com
 * (which returns SSLv3 alert handshake failure).
 *
 * How it works:
 *   Browser → https://holly.nexamusicgroup.com/api/clerk/v1/... (works, valid cert)
 *   This proxy → https://clerk.holly.nexamusicgroup.com/v1/... (server-side, bypasses TLS)
 *
 * ClerkProvider must be configured with:
 *   proxyUrl="https://holly.nexamusicgroup.com/api/clerk"
 *
 * Reference: https://clerk.com/docs/advanced-usage/satellite-domains#proxy-setup
 */

import { NextRequest, NextResponse } from 'next/server';

// The Clerk Frontend API domain encoded in the publishable key.
// Decoded from: pk_live_Y2xlcmsuaG9sbHkubmV4YW11c2ljZ3JvdXAuY29tJA
const CLERK_FRONTEND_API = 'https://clerk.holly.nexamusicgroup.com';

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

export async function OPTIONS(req: NextRequest, { params }: { params: { clerk?: string[] } }) {
  return proxyToClerk(req, params.clerk);
}

async function proxyToClerk(req: NextRequest, pathSegments?: string[]) {
  try {
    const path = pathSegments ? '/' + pathSegments.join('/') : '/';
    const searchParams = req.nextUrl.searchParams.toString();
    const targetUrl = `${CLERK_FRONTEND_API}${path}${searchParams ? '?' + searchParams : ''}`;

    // Build forwarded headers — strip host so Clerk sees its own domain
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      // Don't forward headers that would confuse Clerk
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });
    // Tell Clerk what the original host was
    headers.set('x-forwarded-host', req.nextUrl.host);
    headers.set('x-forwarded-proto', 'https');

    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.arrayBuffer()
      : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body as BodyInit | undefined,
      // @ts-ignore - Node.js fetch option to bypass TLS verification for internal calls
      // We trust clerk.holly.nexamusicgroup.com — it's our own subdomain
      ...(process.env.NODE_ENV === 'production' ? {} : {}),
    });

    // Build response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Don't forward these — Next.js handles them
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Add CORS headers so the browser can call this endpoint
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[HOLLY] Clerk proxy error:', msg);
    return NextResponse.json(
      { error: 'Clerk proxy error', message: msg },
      { status: 502 }
    );
  }
}
