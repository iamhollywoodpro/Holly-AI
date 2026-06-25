import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'no-store';

export async function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.5.0',
    commit: process.env.NEXT_PUBLIC_DEPLOY_SHA ?? 'unknown',
    deploySha: process.env.NEXT_PUBLIC_DEPLOY_SHA ?? 'unknown',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    deployment: 'coolify',
  });
}
