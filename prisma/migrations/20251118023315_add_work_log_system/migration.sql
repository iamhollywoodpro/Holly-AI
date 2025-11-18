-- CreateTable: Work Log System with 90-day Tiered Retention
-- Hot Storage (7 days) → Warm Storage (30 days) → Cold Archive (90 days)

CREATE TABLE "work_logs" (
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

-- CreateTable: Work Log Stats for monitoring
CREATE TABLE "work_log_stats" (
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

-- CreateIndex: Optimize queries by userId
CREATE INDEX "work_logs_userId_idx" ON "work_logs"("userId");

-- CreateIndex: Filter by conversation
CREATE INDEX "work_logs_conversationId_idx" ON "work_logs"("conversationId");

-- CreateIndex: Time-based queries (most common)
CREATE INDEX "work_logs_timestamp_idx" ON "work_logs"("timestamp");

-- CreateIndex: Storage management queries
CREATE INDEX "work_logs_storageStatus_idx" ON "work_logs"("storageStatus");

-- CreateIndex: Cleanup cron job optimization
CREATE INDEX "work_logs_expiresAt_idx" ON "work_logs"("expiresAt");

-- CreateIndex: Compound index for storage tier transitions
CREATE INDEX "work_logs_storageStatus_timestamp_idx" ON "work_logs"("storageStatus", "timestamp");

-- AddForeignKey: Link to users table
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Link to conversations table (optional, nulls if conversation deleted)
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Initialize stats record
INSERT INTO "work_log_stats" ("id", "updatedAt") VALUES ('global_stats', CURRENT_TIMESTAMP);
