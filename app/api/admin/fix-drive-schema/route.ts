// Admin: Fix Google Drive Schema - Add connectedAt column
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
    
    console.log('[Schema Fix] Checking GoogleDriveConnection table...');
    
    // Check if connectedAt column exists
    try {
      // Prisma maps GoogleDriveConnection to google_drive_connections
      const tableName = 'google_drive_connections';
      
      // First check if table exists
      const tableCheck = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'google_drive_connections'
      `);
      
      if (Array.isArray(tableCheck) && tableCheck.length === 0) {
        console.log('[Schema Fix] ❌ Table does not exist!');
        return NextResponse.json({
          error: 'Table missing',
          message: 'GoogleDriveConnection table does not exist. Run /api/admin/create-drive-table first.',
          action: 'table_missing'
        }, { status: 404 });
      }
      
      // Table exists, confirm it's the right name
      console.log('[Schema Fix] Found table:', tableName);
      
      // Check for both snake_case (connected_at) and camelCase (connectedAt)
      const columnCheck = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'google_drive_connections' 
        AND (column_name = 'connected_at' OR column_name = 'connectedAt')
      `);
      
      console.log('[Schema Fix] Column check result:', columnCheck);
      
      if (Array.isArray(columnCheck) && columnCheck.length === 0) {
        console.log('[Schema Fix] connectedAt column missing, adding it...');
        
        // Use camelCase (same as other columns: isConnected, googleEmail, etc)
        // Match the naming convention in the original migration
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "google_drive_connections" 
          ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        `);
        
        console.log('[Schema Fix] ✅ Column "connectedAt" added successfully!');
        
        return NextResponse.json({
          success: true,
          message: 'connectedAt column added to google_drive_connections table',
          action: 'added_column',
          columnName: 'connectedAt'
        });
      }
      
      console.log('[Schema Fix] ✅ Column already exists:', columnCheck);
      
      return NextResponse.json({
        success: true,
        message: 'connected_at column already exists',
        action: 'no_change_needed',
        column: columnCheck
      });
      
    } catch (error: any) {
      console.error('[Schema Fix] Error:', error);
      
      return NextResponse.json({
        error: 'Schema fix failed',
        message: error.message,
        details: error.stack
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[Schema Fix] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Fix failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
