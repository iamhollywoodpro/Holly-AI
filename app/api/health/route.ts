// ─────────────────────────────────────────────────────────────────────────────
// /api/health — Minimal health probe endpoint
//
// RULES (DO NOT VIOLATE):
//  1. Must ALWAYS return HTTP 200 — even if the database is down
//  2. Must respond in < 2 seconds — no external calls, no DB queries
//  3. No authentication — Clerk middleware MUST bypass this route
//     (see middleware.ts BYPASS_PATHS)
//  4. No imports from src/lib that could throw at module-load time
//
// Used by: Docker HEALTHCHECK, Coolify, Traefik upstream health probe.
// A non-200 response marks the container as unhealthy and Traefik stops
// routing traffic → Gateway Timeout for all users.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Explicitly mark as public so any future auth middleware changes don't
// accidentally protect this route.
export const fetchCache = 'no-store';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Check': 'true',
      },
    }
  );
}

// HEAD is used by some load balancers / Traefik health probes
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'X-Health-Check': 'true',
    },
  });
}
