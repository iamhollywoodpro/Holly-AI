// Admin: Check GoogleDriveConnection Columns
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get columns from google_drive_connections table
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'google_drive_connections'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      success: true,
      table: 'google_drive_connections',
      columns,
      message: 'All columns in google_drive_connections table'
    });
    
  } catch (error: any) {
    console.error('[Check Columns] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to check columns',
      message: error.message
    }, { status: 500 });
  }
}
