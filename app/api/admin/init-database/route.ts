// Admin: Initialize Database - Add Missing Columns
// This endpoint safely adds missing columns to production database
// Run once after deployment: fetch('/api/admin/init-database', { method: 'POST' })

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Only allow for admin user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { email: true }
    });
    
    if (!user || user.email !== 'iamhollywoodpro@gmail.com') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'This endpoint is for admins only'
      }, { status: 403 });
    }
    
    console.log('[DB Init] Starting database initialization...');
    const results: any[] = [];
    
    // ===================================================
    // 1. Add connectedAt to GoogleDriveConnection
    // ===================================================
    try {
      console.log('[DB Init] Checking google_drive_connections.connectedAt...');
      
      const columnCheck = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'google_drive_connections' 
        AND (column_name = 'connected_at' OR column_name = 'connectedAt')
      `);
      
      if (Array.isArray(columnCheck) && columnCheck.length === 0) {
        console.log('[DB Init] Adding connectedAt column...');
        
        // Use camelCase to match other columns in the table
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "google_drive_connections" 
          ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        `);
        
        results.push({
          table: 'google_drive_connections',
          column: 'connectedAt',
          action: 'added',
          status: 'success'
        });
        
        console.log('[DB Init] ✅ connectedAt added');
      } else {
        results.push({
          table: 'google_drive_connections',
          column: 'connectedAt',
          action: 'skipped',
          status: 'already_exists'
        });
        
        console.log('[DB Init] ✅ connectedAt already exists');
      }
    } catch (error: any) {
      results.push({
        table: 'google_drive_connections',
        column: 'connectedAt',
        action: 'failed',
        status: 'error',
        error: error.message
      });
      
      console.error('[DB Init] ❌ connectedAt failed:', error.message);
    }
    
    // ===================================================
    // 2. Future: Add other missing columns here
    // ===================================================
    // Example:
    // - Add new columns for future features
    // - Modify existing column types
    // - Add indexes for performance
    
    // ===================================================
    // Summary
    // ===================================================
    const summary = {
      success: results.every(r => r.status !== 'error'),
      total: results.length,
      added: results.filter(r => r.action === 'added').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    };
    
    console.log('[DB Init] Complete:', summary);
    
    return NextResponse.json({
      success: summary.success,
      message: 'Database initialization complete',
      summary
    });
    
  } catch (error: any) {
    console.error('[DB Init] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Initialization failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// GET: Check what would be done (dry run)
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check google_drive_connections.connectedAt
    const columnCheck = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'google_drive_connections' 
      AND (column_name = 'connected_at' OR column_name = 'connectedAt')
    `);
    
    const needsConnectedAt = Array.isArray(columnCheck) && columnCheck.length === 0;
    
    return NextResponse.json({
      message: 'Dry run - no changes made',
      checks: [
        {
          table: 'google_drive_connections',
          column: 'connectedAt',
          exists: !needsConnectedAt,
          action: needsConnectedAt ? 'will_add' : 'no_action_needed'
        }
      ]
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Check failed',
      message: error.message
    }, { status: 500 });
  }
}
