/**
 * Clerk API Proxy
 *
 * Routes all Clerk authentication API calls through Holly's own domain,
 * bypassing the broken TLS certificate on clerk.holly.nexamusicgroup.com.
 *
 * THE PROBLEM:
 * The publishable key encodes 'clerk.holly.nexamusicgroup.com' as the Frontend API.
 * That subdomain is on Cloudflare but has NO valid SSL certificate —
 * every TLS connection gets "SSLv3 alert handshake failure" (rejected by Cloudflare).
 * Browsers refuse to connect → ALL Clerk auth API calls fail silently.
 *
 * THE FIX (server-side SNI override):
 *   Both clerk.clerk.com and clerk.holly.nexamusicgroup.com resolve to the same
 *   Cloudflare IP (172.64.153.110), but only clerk.clerk.com has a valid cert.
 *
 *   We connect to the IP directly, use clerk.clerk.com as the TLS SNI (gets the
 *   valid cert), use clerk.clerk.com as the HTTP Host, and identify the Holly
 *   application via the ?__clerk_publishable_key= query parameter.
 *
 *   Browser → https://holly.nexamusicgroup.com/api/clerk/v1/... (valid cert ✅)
 *   Proxy → 172.64.153.110:443 (Cloudflare IP, SNI=clerk.clerk.com ✅)
 *   Result → Clerk serves Holly's auth config correctly ✅
 *
 * ClerkProvider is configured with:
 *   proxyUrl="https://holly.nexamusicgroup.com/api/clerk"
 */

import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// The real Clerk API hostname with a valid SSL certificate.
// clerk.holly.nexamusicgroup.com resolves to the same Cloudflare infrastructure
// but has a broken/missing TLS cert. Using clerk.clerk.com for the connection
// gets a valid cert while the __clerk_publishable_key param identifies Holly's app.
const CLERK_SNI_HOST = 'clerk.clerk.com';

// Holly's publishable key — identifies which Clerk application to serve.
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_live_Y2xlcmsuaG9sbHkubmV4YW11c2ljZ3JvdXAuY29tJA';

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

function proxyToClerk(req: NextRequest, pathSegments?: string[]): Promise<NextResponse> {
  return new Promise(async (resolve) => {
    try {
      const path = pathSegments ? '/' + pathSegments.join('/') : '/';
      const searchParams = req.nextUrl.searchParams.toString();

      // Inject the publishable key so Clerk can identify Holly's app instance.
      // This is needed because we're routing through clerk.clerk.com (not the custom domain).
      const qs = new URLSearchParams(searchParams || '');
      if (!qs.has('__clerk_publishable_key')) {
        qs.set('__clerk_publishable_key', PUBLISHABLE_KEY);
      }
      const finalPath = `${path}?${qs.toString()}`;

      const body =
        req.method !== 'GET' && req.method !== 'HEAD'
          ? Buffer.from(await req.arrayBuffer())
          : undefined;

      // Build headers — strip problematic ones, keep the rest
      const reqHeaders: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (!['host', 'connection', 'content-length', 'transfer-encoding'].includes(lower)) {
          reqHeaders[key] = value;
        }
      });

      // Override with routing headers for clerk.clerk.com
      reqHeaders['host'] = CLERK_SNI_HOST;
      reqHeaders['origin'] = 'https://holly.nexamusicgroup.com';
      // CRITICAL: x-forwarded-host must be the Clerk custom domain (not holly.nexamusicgroup.com)
      // Clerk uses x-forwarded-host to identify which app instance to serve.
      // holly.nexamusicgroup.com is not registered with Clerk — only clerk.holly.nexamusicgroup.com is.
      reqHeaders['x-forwarded-host'] = 'clerk.holly.nexamusicgroup.com';
      reqHeaders['x-forwarded-proto'] = 'https';
      if (body) reqHeaders['content-length'] = String(body.byteLength);

      const options: https.RequestOptions = {
        // Use hostname (not host) so Node.js automatically sets SNI to clerk.clerk.com.
        // Both clerk.clerk.com and clerk.holly.nexamusicgroup.com resolve to the same
        // Cloudflare IP, but only clerk.clerk.com has a valid TLS cert there.
        hostname: CLERK_SNI_HOST,
        port: 443,
        path: finalPath,
        method: req.method,
        headers: reqHeaders,
      };

      const chunks: Buffer[] = [];
      const nodeReq = https.request(options, (nodeRes) => {
        nodeRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        nodeRes.on('end', () => {
          const responseData = Buffer.concat(chunks);

          const responseHeaders = new Headers();
          Object.entries(nodeRes.headers).forEach(([key, value]) => {
            const lower = key.toLowerCase();
            if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lower) && value) {
              responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
            }
          });

          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

          resolve(
            new NextResponse(responseData, {
              status: nodeRes.statusCode || 200,
              headers: responseHeaders,
            })
          );
        });
      });

      nodeReq.on('error', (err) => {
        console.error('[HOLLY] Clerk proxy error:', err.message);
        resolve(
          NextResponse.json(
            { error: 'Clerk proxy connection failed', message: err.message },
            { status: 502 }
          )
        );
      });

      nodeReq.setTimeout(15000, () => {
        nodeReq.destroy();
        resolve(NextResponse.json({ error: 'Clerk proxy timeout' }, { status: 504 }));
      });

      if (body) nodeReq.write(body);
      nodeReq.end();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[HOLLY] Clerk proxy setup error:', msg);
      resolve(
        NextResponse.json({ error: 'Proxy setup error', message: msg }, { status: 502 })
      );
    }
  });
}
