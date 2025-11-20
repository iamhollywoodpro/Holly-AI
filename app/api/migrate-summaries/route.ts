import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Migration endpoint to add conversation_summaries table
 * Run once: https://holly.nexamusicgroup.com/api/migrate-summaries
 */
export async function GET() {
  try {
    // Check if the table already exists by trying to count
    try {
      await prisma.$queryRaw`SELECT COUNT(*) FROM conversation_summaries LIMIT 1`;
      return NextResponse.json({
        success: true,
        message: 'conversation_summaries table already exists',
        alreadyExists: true,
      });
    } catch (tableError: any) {
      // Table doesn't exist, create it
      if (tableError.code === '42P01' || tableError.message?.includes('does not exist')) {
        console.log('Creating conversation_summaries table...');
        
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "conversation_summaries" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "conversationId" TEXT NOT NULL UNIQUE,
            "summary" TEXT NOT NULL,
            "keyPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "outcome" TEXT,
            "importantMoments" JSONB DEFAULT '[]'::jsonb,
            "progress" DOUBLE PRECISION,
            "projectId" TEXT,
            "messageCount" INTEGER NOT NULL DEFAULT 0,
            "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT "conversation_summaries_conversationId_fkey" 
              FOREIGN KEY ("conversationId") 
              REFERENCES "conversations"("id") 
              ON DELETE CASCADE 
              ON UPDATE CASCADE
          );
        `);

        // Create indexes
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "conversation_summaries_conversationId_idx" 
          ON "conversation_summaries"("conversationId");
        `);

        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "conversation_summaries_generatedAt_idx" 
          ON "conversation_summaries"("generatedAt");
        `);

        console.log('✅ conversation_summaries table created successfully');

        return NextResponse.json({
          success: true,
          message: 'conversation_summaries table created successfully',
          created: true,
        });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
