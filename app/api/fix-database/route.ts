import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Drop existing incomplete tables if they exist
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS work_logs CASCADE`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS work_log_stats CASCADE`);

    // Create work_logs table with ALL required columns from Prisma schema
    await prisma.$executeRawUnsafe(`
      CREATE TABLE work_logs (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "conversationId" TEXT,
        "logType" TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT,
        metadata JSONB,
        "storageStatus" TEXT NOT NULL DEFAULT 'hot',
        "compressionLevel" INTEGER NOT NULL DEFAULT 0,
        "archiveUrl" TEXT,
        timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3),
        "archivedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create work_log_stats table with ALL required columns
    await prisma.$executeRawUnsafe(`
      CREATE TABLE work_log_stats (
        id TEXT PRIMARY KEY,
        "totalLogsCreated" INTEGER NOT NULL DEFAULT 0,
        "hotStorageCount" INTEGER NOT NULL DEFAULT 0,
        "warmStorageCount" INTEGER NOT NULL DEFAULT 0,
        "coldStorageCount" INTEGER NOT NULL DEFAULT 0,
        "totalSizeBytes" BIGINT NOT NULL DEFAULT 0,
        "lastCleanupRun" TIMESTAMP(3),
        "lastArchivalRun" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "work_logs_userId_idx" ON work_logs("userId")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX "work_logs_conversationId_idx" ON work_logs("conversationId")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX "work_logs_timestamp_idx" ON work_logs(timestamp)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX "work_logs_storageStatus_idx" ON work_logs("storageStatus")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX "work_logs_expiresAt_idx" ON work_logs("expiresAt")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX "work_logs_storageStatus_timestamp_idx" ON work_logs("storageStatus", timestamp)
    `);

    // Add foreign key constraints
    await prisma.$executeRawUnsafe(`
      ALTER TABLE work_logs 
      ADD CONSTRAINT "work_logs_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE work_logs 
      ADD CONSTRAINT "work_logs_conversationId_fkey" 
      FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE SET NULL
    `);

    // Test that tables exist and are working
    const workLogCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM work_logs');
    const statsCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM work_log_stats');

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: '✅ Database tables created successfully with FULL schema!',
      tables_created: ['work_logs (complete)', 'work_log_stats (complete)'],
      indexes_created: [
        'work_logs_userId_idx',
        'work_logs_conversationId_idx',
        'work_logs_timestamp_idx',
        'work_logs_storageStatus_idx',
        'work_logs_expiresAt_idx',
        'work_logs_storageStatus_timestamp_idx'
      ],
      foreign_keys_created: [
        'work_logs_userId_fkey',
        'work_logs_conversationId_fkey'
      ],
      verification: {
        work_logs_table: 'exists and ready',
        work_log_stats_table: 'exists and ready'
      },
      next_step: 'HOLLY should now work perfectly! Try sending a message.'
    });

  } catch (error: any) {
    console.error('Database creation error:', error);
    
    await prisma.$disconnect();
    
    return NextResponse.json(
      {
        error: 'Failed to create database tables',
        details: error.message,
        hint: error.message.includes('does not exist') 
          ? 'Missing parent tables (users/conversations). Run full Prisma migration first.'
          : 'Check Vercel logs for more details'
      },
      { status: 500 }
    );
  }
}
