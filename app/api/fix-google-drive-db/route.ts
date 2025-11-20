import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log('[Fix Google Drive DB] Starting database fix...');

    // Check if table exists
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'google_drive_connections'
      );
    `;
    
    console.log('[Fix Google Drive DB] Table check result:', tableCheck);

    // Create the table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "google_drive_connections" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "tokenExpiry" TIMESTAMP(3) NOT NULL,
        "scope" TEXT NOT NULL,
        "googleEmail" TEXT NOT NULL,
        "googleId" TEXT NOT NULL,
        "googleName" TEXT,
        "googlePicture" TEXT,
        "autoUpload" BOOLEAN NOT NULL DEFAULT false,
        "autoUploadFolder" TEXT,
        "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSyncAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "google_drive_connections_userId_fkey" 
          FOREIGN KEY ("userId") 
          REFERENCES "users"("id") 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      );
    `;

    console.log('[Fix Google Drive DB] Table created/verified');

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "google_drive_connections_userId_idx" 
      ON "google_drive_connections"("userId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "google_drive_connections_googleId_idx" 
      ON "google_drive_connections"("googleId");
    `;

    console.log('[Fix Google Drive DB] Indexes created');

    // Verify table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'google_drive_connections'
      ORDER BY ordinal_position;
    `;

    console.log('[Fix Google Drive DB] Table structure:', columns);

    return NextResponse.json({
      success: true,
      message: 'Google Drive database structure verified/created successfully',
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
