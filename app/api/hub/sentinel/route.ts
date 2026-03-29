/**
 * GET /api/hub/sentinel — Sentinel tool manifest
 */
import { NextResponse } from 'next/server';
import { getTool } from '@/lib/hub/registry';

export async function GET() {
  const tool = getTool('sentinel');
  return NextResponse.json({ ok: true, tool });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
