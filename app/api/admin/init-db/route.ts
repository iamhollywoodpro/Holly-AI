/**
 * Admin Database Initialization Endpoint
 * Creates missing tables directly
 * 
 * SECURITY: Only for emergency use
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the secret key from request
    const body = await request.json();
    const { secret } = body;

    // Simple security check
    if (secret !== 'HOLLY-DEPLOY-2024') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    console.log('🔧 Initializing database tables...');

    // Create work_logs table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "work_logs" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "conversationId" TEXT,
        "logType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "details" TEXT,
        "metadata" JSONB,
        "storageStatus" TEXT NOT NULL DEFAULT 'hot',
        "compressionLevel" INTEGER NOT NULL DEFAULT 0,
        "archiveUrl" TEXT,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3),
        "archivedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create work_log_stats table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "work_log_stats" (
        "id" TEXT NOT NULL,
        "totalLogsCreated" INTEGER NOT NULL DEFAULT 0,
        "hotStorageCount" INTEGER NOT NULL DEFAULT 0,
        "warmStorageCount" INTEGER NOT NULL DEFAULT 0,
        "coldStorageCount" INTEGER NOT NULL DEFAULT 0,
        "totalSizeBytes" BIGINT NOT NULL DEFAULT 0,
        "lastCleanupRun" TIMESTAMP(3),
        "lastArchivalRun" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "work_log_stats_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_userId_idx" ON "work_logs"("userId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_conversationId_idx" ON "work_logs"("conversationId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_timestamp_idx" ON "work_logs"("timestamp");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_storageStatus_idx" ON "work_logs"("storageStatus");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_expiresAt_idx" ON "work_logs"("expiresAt");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_userId_timestamp_idx" ON "work_logs"("userId", "timestamp");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "work_logs_logType_idx" ON "work_logs"("logType");
    `);

    console.log('✅ Database tables initialized successfully');

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      tables: ['work_logs', 'work_log_stats'],
      indexes: 7
    });

  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}
