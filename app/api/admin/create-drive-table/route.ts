// Admin: Create GoogleDriveConnection Table
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Only allow for admin user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { email: true }
    });
    
    if (!user || user.email !== 'iamhollywoodpro@gmail.com') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'This endpoint is for admins only'
      }, { status: 403 });
    }
    
    console.log('[Create Table] Checking if GoogleDriveConnection table exists...');
    
    try {
      // Check if table exists (both naming conventions)
      const tableCheck = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name = 'GoogleDriveConnection' OR table_name = 'google_drive_connection')
      `);
      
      if (Array.isArray(tableCheck) && tableCheck.length > 0) {
        const tableName = (tableCheck[0] as any).table_name;
        return NextResponse.json({
          success: true,
          message: `Table already exists: ${tableName}`,
          action: 'no_change_needed'
        });
      }
      
      console.log('[Create Table] Table not found, creating GoogleDriveConnection...');
      
      // Create the table with snake_case name (PostgreSQL default)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "GoogleDriveConnection" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "accessToken" TEXT NOT NULL,
          "refreshToken" TEXT NOT NULL,
          "isConnected" BOOLEAN NOT NULL DEFAULT true,
          "googleEmail" TEXT,
          "googleName" TEXT,
          "googlePicture" TEXT,
          "autoUpload" BOOLEAN NOT NULL DEFAULT false,
          "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
          "quotaUsed" BIGINT NOT NULL DEFAULT 0,
          "quotaLimit" BIGINT,
          "lastSyncAt" TIMESTAMP(3),
          "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "GoogleDriveConnection_pkey" PRIMARY KEY ("id")
        );
      `);
      
      // Add unique constraint on userId
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "GoogleDriveConnection_userId_key" 
        ON "GoogleDriveConnection"("userId");
      `);
      
      // Add foreign key constraint to User table
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "GoogleDriveConnection" 
        ADD CONSTRAINT "GoogleDriveConnection_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      
      console.log('[Create Table] ✅ GoogleDriveConnection table created successfully!');
      
      return NextResponse.json({
        success: true,
        message: 'GoogleDriveConnection table created successfully',
        action: 'table_created'
      });
      
    } catch (error: any) {
      console.error('[Create Table] Error:', error);
      
      return NextResponse.json({
        error: 'Table creation failed',
        message: error.message,
        details: error.stack
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[Create Table] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Failed to create table',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
