/**
 * Admin Migration Endpoint
 * Run database migrations manually
 * 
 * SECURITY: Only Steve can access this
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAdmin } from '@/lib/auth/require-admin';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
  const adminGate = await requireAdmin();
  if (adminGate instanceof NextResponse) return adminGate;
    // Creator/admin gate above is the sole authorization.
    // Removed the hardcoded 'HOLLY-DEPLOY-2024' secret check (S7-class issue):
    // a public constant provides no security and blocked nothing.

    console.log('🔧 Running database migrations...');

    // Run Prisma migrate deploy
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

    console.log('✅ Migration output:', stdout);
    if (stderr) console.error('⚠️ Migration stderr:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Migrations completed successfully',
      output: stdout,
      stderr: stderr || null
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stderr || error.stdout || null
    }, { status: 500 });
  }
}
