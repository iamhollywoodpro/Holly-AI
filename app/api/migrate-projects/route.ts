import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log('[Migrate Projects] Starting migration...');

    // Add new columns
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "category" TEXT;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "conversationIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#a855f7';
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "icon" TEXT;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "visibility" TEXT DEFAULT 'private';
    `;

    console.log('[Migrate Projects] Columns added');

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "projects_startDate_idx" ON "projects"("startDate");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "projects_category_idx" ON "projects"("category");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "projects_technologies_idx" ON "projects" USING GIN ("technologies");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "projects_conversationIds_idx" ON "projects" USING GIN ("conversationIds");
    `;

    console.log('[Migrate Projects] Indexes created');

    return NextResponse.json({
      success: true,
      message: 'Projects table migrated successfully for timeline features',
    });

  } catch (error) {
    console.error('[Migrate Projects] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
