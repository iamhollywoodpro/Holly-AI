import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'Database URL not configured' },
        { status: 500 }
      );
    }

    const sql = neon(databaseUrl);

    // Create work_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS work_logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        metadata JSONB,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create work_log_stats table
    await sql`
      CREATE TABLE IF NOT EXISTS work_log_stats (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_entries INTEGER NOT NULL DEFAULT 0,
        categories JSONB NOT NULL DEFAULT '{}',
        last_updated TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS work_logs_timestamp_idx ON work_logs(timestamp DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS work_logs_category_idx ON work_logs(category)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS work_log_stats_date_idx ON work_log_stats(date DESC)
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Database tables created successfully!',
      tables_created: ['work_logs', 'work_log_stats'],
      indexes_created: [
        'work_logs_timestamp_idx',
        'work_logs_category_idx', 
        'work_log_stats_date_idx'
      ],
      next_step: 'HOLLY should now work! Try sending a message.'
    });

  } catch (error: any) {
    console.error('Database creation error:', error);
    
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
