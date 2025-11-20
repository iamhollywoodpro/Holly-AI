import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Use Prisma's raw SQL execution to create tables
    // This bypasses the ORM and runs direct SQL commands
    
    // Create work_logs table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS work_logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        metadata JSONB,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create work_log_stats table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS work_log_stats (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_entries INTEGER NOT NULL DEFAULT 0,
        categories JSONB NOT NULL DEFAULT '{}',
        last_updated TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS work_logs_timestamp_idx ON work_logs(timestamp DESC)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS work_logs_category_idx ON work_logs(category)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS work_log_stats_date_idx ON work_log_stats(date DESC)
    `);

    // Test that tables exist by counting rows
    const workLogCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM work_logs');
    const statsCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM work_log_stats');

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: '✅ Database tables created successfully!',
      tables_created: ['work_logs', 'work_log_stats'],
      indexes_created: [
        'work_logs_timestamp_idx',
        'work_logs_category_idx', 
        'work_log_stats_date_idx'
      ],
      verification: {
        work_logs_table: 'exists',
        work_log_stats_table: 'exists'
      },
      next_step: 'HOLLY should now work! Try sending a message.'
    });

  } catch (error: any) {
    console.error('Database creation error:', error);
    
    await prisma.$disconnect();
    
    return NextResponse.json(
      {
        error: 'Failed to create database tables',
        details: error.message,
        hint: 'Check Vercel logs for more details'
      },
      { status: 500 }
    );
  }
}
