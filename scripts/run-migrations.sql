-- HOLLY Database Migration Script
-- Run this directly in your Neon SQL Editor
-- This creates the missing work_logs table

-- Create work_logs table
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

-- Create work_log_stats table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "work_logs_userId_idx" ON "work_logs"("userId");
CREATE INDEX IF NOT EXISTS "work_logs_conversationId_idx" ON "work_logs"("conversationId");
CREATE INDEX IF NOT EXISTS "work_logs_timestamp_idx" ON "work_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "work_logs_storageStatus_idx" ON "work_logs"("storageStatus");
CREATE INDEX IF NOT EXISTS "work_logs_expiresAt_idx" ON "work_logs"("expiresAt");
CREATE INDEX IF NOT EXISTS "work_logs_userId_timestamp_idx" ON "work_logs"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "work_logs_logType_idx" ON "work_logs"("logType");

-- Add foreign key to User table
ALTER TABLE "work_logs" DROP CONSTRAINT IF EXISTS "work_logs_userId_fkey";
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key to Conversation table
ALTER TABLE "work_logs" DROP CONSTRAINT IF EXISTS "work_logs_conversationId_fkey";
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_conversationId_fkey" 
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Success message
SELECT 'work_logs table created successfully!' as result;
