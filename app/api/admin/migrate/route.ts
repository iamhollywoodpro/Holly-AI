/**
 * Admin Migration Endpoint
 * Run database migrations manually
 * 
 * SECURITY: Only Steve can access this
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the secret key from request
    const body = await request.json();
    const { secret } = body;

    // Simple security check - you can change this secret
    if (secret !== 'HOLLY-DEPLOY-2024') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

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
