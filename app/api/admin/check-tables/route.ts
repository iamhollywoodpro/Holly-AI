// Admin: Check Database Table Names
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
    
    // Get all table names
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    return NextResponse.json({
      success: true,
      tables,
      message: 'All database tables'
    });
    
  } catch (error: any) {
    console.error('[Check Tables] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to check tables',
      message: error.message
    }, { status: 500 });
  }
}
