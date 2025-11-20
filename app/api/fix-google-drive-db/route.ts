import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log('[Fix Google Drive DB] Starting complete database fix...');

    // Drop existing table if it has wrong structure
    try {
      await prisma.$executeRaw`DROP TABLE IF EXISTS "google_drive_connections" CASCADE;`;
      console.log('[Fix Google Drive DB] Dropped old table');
    } catch (error) {
      console.log('[Fix Google Drive DB] No existing table to drop');
    }

    // Create the table with complete structure
    await prisma.$executeRaw`
      CREATE TABLE "google_drive_connections" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "tokenExpiry" TIMESTAMP(3) NOT NULL,
        "googleEmail" TEXT NOT NULL,
        "googleName" TEXT,
        "googlePicture" TEXT,
        "rootFolderId" TEXT,
        "quotaUsed" BIGINT NOT NULL DEFAULT 0,
        "quotaLimit" BIGINT,
        "isConnected" BOOLEAN NOT NULL DEFAULT true,
        "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastErrorAt" TIMESTAMP(3),
        "lastError" TEXT,
        "autoUpload" BOOLEAN NOT NULL DEFAULT true,
        "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
        "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        "metadata" JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "google_drive_connections_userId_fkey" 
          FOREIGN KEY ("userId") 
          REFERENCES "users"("id") 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      );
    `;

    console.log('[Fix Google Drive DB] Table created with complete structure');

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "google_drive_connections_userId_idx" 
      ON "google_drive_connections"("userId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "google_drive_connections_googleEmail_idx" 
      ON "google_drive_connections"("googleEmail");
    `;

    console.log('[Fix Google Drive DB] Indexes created');

    // Verify table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'google_drive_connections'
      ORDER BY ordinal_position;
    `;

    console.log('[Fix Google Drive DB] Table structure:', columns);

    return NextResponse.json({
      success: true,
      message: 'Google Drive database structure created successfully with ALL required columns',
      tableExists: true,
      columns: columns
    });

  } catch (error) {
    console.error('[Fix Google Drive DB] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
