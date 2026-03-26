import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
  try {
    // Check what columns exist in work_logs table
    const tableInfo = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'work_logs'
      ORDER BY ordinal_position
    `);

    return NextResponse.json({
      success: true,
      table: 'work_logs',
      columns: tableInfo
    });

  } catch (error: any) {
    
    return NextResponse.json(
      {
        error: 'Failed to check table',
        details: error.message
      },
      { status: 500 }
    );
  }
}
