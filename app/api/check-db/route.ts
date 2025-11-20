import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check what columns exist in work_logs table
    const tableInfo = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'work_logs'
      ORDER BY ordinal_position
    `);

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      table: 'work_logs',
      columns: tableInfo
    });

  } catch (error: any) {
    await prisma.$disconnect();
    
    return NextResponse.json(
      {
        error: 'Failed to check table',
        details: error.message
      },
      { status: 500 }
    );
  }
}
