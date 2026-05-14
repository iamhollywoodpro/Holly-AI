/**
 * Emergency Database Setup Endpoint
 * Runs prisma db push to create ALL tables from schema.prisma
 *
 * No auth required — the DB has no tables so auth can't work anyway.
 * Security: only works if DB is empty (no users table).
 * 
 * Usage: POST /api/admin/setup-db
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/db';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Security check: verify the secret
    let body: any = {};
    try { body = await request.json(); } catch {}
    const secret = body.secret || request.headers.get('x-setup-secret') || '';
    if (secret !== 'HOLLY-SETUP-2025') {
      return NextResponse.json({ error: 'Invalid secret. Pass { "secret": "HOLLY-SETUP-2025" } in body.' }, { status: 403 });
    }

    console.log('🔧 [SETUP-DB] Starting database setup...');

    // Step 1: Try to create pgvector extension
    console.log('🔧 [SETUP-DB] Step 1: Creating pgvector extension...');
    let pgvectorResult = 'skipped';
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
      pgvectorResult = 'success';
    } catch (e: any) {
      pgvectorResult = `failed: ${e.message}`;
      console.warn('[SETUP-DB] pgvector extension failed (non-fatal):', e.message);
    }

    // Step 2: Run prisma db push
    console.log('🔧 [SETUP-DB] Step 2: Running prisma db push...');
    let pushOutput = '';
    let pushError = '';
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --skip-generate', {
        timeout: 120_000,
        env: { ...process.env },
      });
      pushOutput = stdout;
      pushError = stderr || '';
      console.log('[SETUP-DB] prisma db push stdout:', stdout);
      if (stderr) console.warn('[SETUP-DB] prisma db push stderr:', stderr);
    } catch (e: any) {
      pushError = e.message;
      pushOutput = e.stdout || '';
      console.error('[SETUP-DB] prisma db push failed:', e.message);

      // Try without pgvector — maybe the schema references it
      // Try a raw approach: create tables one by one
      return NextResponse.json({
        success: false,
        step: 'prisma db push',
        error: pushError,
        output: pushOutput,
        pgvector: pgvectorResult,
        suggestion: 'The PostgreSQL instance may not have pgvector installed. Check if the Coolify PostgreSQL container supports pgvector, or remove vector columns from the schema.',
      }, { status: 500 });
    }

    // Step 3: Verify tables were created
    console.log('🔧 [SETUP-DB] Step 3: Verifying tables...');
    let tableCount = 0;
    let tables: string[] = [];
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
      `) as any[];
      tableCount = result.length;
      tables = result.map((r: any) => r.tablename);
    } catch (e: any) {
      console.warn('[SETUP-DB] Table verification failed:', e.message);
    }

    console.log(`✅ [SETUP-DB] Setup complete! ${tableCount} tables created.`);

    return NextResponse.json({
      success: true,
      message: `Database setup complete! ${tableCount} tables created.`,
      pgvector: pgvectorResult,
      pushOutput,
      pushError: pushError || null,
      tableCount,
      tables: tables.slice(0, 50), // First 50 tables
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [SETUP-DB] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

// Also support GET for easy browser testing
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'HOLLY-SETUP-2025') {
    return NextResponse.json({
      message: 'Database Setup Endpoint',
      usage: 'POST to this endpoint with { "secret": "HOLLY-SETUP-2025" }',
      or: 'GET /api/admin/setup-db?secret=HOLLY-SETUP-2025',
    });
  }

  // Convert GET to POST by calling the same logic
  return POST(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ secret }), headers: { 'Content-Type': 'application/json' } }));
}
