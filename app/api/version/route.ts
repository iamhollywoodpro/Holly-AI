import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    version: '2.0-complete-rewrite',
    commit: '26c1061',
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    message: 'Complete streaming rewrite with local state - NO Zustand updates during streaming',
  });
}
