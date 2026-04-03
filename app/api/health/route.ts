import { NextResponse } from 'next/server';

// PUBLIC endpoint - no auth required
// This is ONLY used by Docker/Coolify healthcheck to confirm the process is alive.
// It must respond in < 5 seconds and always return HTTP 200.
// DB checks, env checks, and external API checks are intentionally NOT done here —
// they all risk hanging or returning non-200 which kills the container.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Ultra-minimal health check: just confirm the Node.js process and Next.js
  // server are running. Nothing that can hang or fail externally.
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
