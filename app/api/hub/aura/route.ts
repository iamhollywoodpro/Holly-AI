/**
 * GET /api/hub/aura — AURA tool manifest
 */
import { NextResponse } from 'next/server';
import { getTool } from '@/lib/hub/registry';

export async function GET() {
  const tool = getTool('aura');
  return NextResponse.json({ ok: true, tool });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
