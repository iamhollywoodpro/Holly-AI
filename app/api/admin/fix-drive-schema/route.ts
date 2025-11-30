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
      // Try both naming conventions (PascalCase and snake_case)
      let tableName = 'GoogleDriveConnection';
      
      // First check which table name exists
      const tableCheck = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name = 'GoogleDriveConnection' OR table_name = 'google_drive_connection')
      `);
      
      if (Array.isArray(tableCheck) && tableCheck.length === 0) {
        console.log('[Schema Fix] ❌ Table does not exist!');
        return NextResponse.json({
          error: 'Table missing',
          message: 'GoogleDriveConnection table does not exist. Run /api/admin/create-drive-table first.',
          action: 'table_missing'
        }, { status: 404 });
      }
      
      tableName = (tableCheck[0] as any).table_name;
      console.log('[Schema Fix] Found table:', tableName);
      
      const columnCheck = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND (column_name = 'connectedAt' OR column_name = 'connected_at')
      `);
      
      console.log('[Schema Fix] Column check result:', columnCheck);
      
      if (Array.isArray(columnCheck) && columnCheck.length === 0) {
        console.log('[Schema Fix] connectedAt column missing, adding it...');
        
        // Add the connectedAt column with DEFAULT now()
        // Use snake_case for column name if table is snake_case
        const columnName = tableName === 'google_drive_connection' ? 'connected_at' : 'connectedAt';
        
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${tableName}" 
          ADD COLUMN IF NOT EXISTS "${columnName}" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        `);
        
        console.log('[Schema Fix] ✅ Column added successfully!');
        
        return NextResponse.json({
          success: true,
          message: 'connectedAt column added to GoogleDriveConnection table',
          action: 'added_column'
        });
      }
      
      console.log('[Schema Fix] ✅ Column already exists');
      
      return NextResponse.json({
        success: true,
        message: 'connectedAt column already exists',
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
