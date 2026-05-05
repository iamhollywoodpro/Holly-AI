import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronSecret = req.headers.get('x-cron-secret');
    const bodySecret = await req.json().then(b => b.secret).catch(() => '');
    const secret = process.env.CRON_SECRET;
    if (!secret || (cronSecret !== secret && bodySecret !== secret)) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    const results: string[] = [];

    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
      results.push('pgvector extension enabled');
    } catch (err: unknown) {
      results.push(`Extension: ${(err as Error).message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "memory_embeddings" (
          "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId"    TEXT NOT NULL,
          "content"   TEXT NOT NULL,
          "type"      TEXT NOT NULL DEFAULT 'conversation',
          "embedding" vector(4096),
          "metadata"  JSONB DEFAULT '{}',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      results.push('memory_embeddings table created');
    } catch (err: unknown) {
      results.push(`Table: ${(err as Error).message}`);
    }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_memory_embeddings_userId ON "memory_embeddings" ("userId");`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_memory_embeddings_type ON "memory_embeddings" ("type");`,
      );
      results.push('Indexes created');
    } catch (err: unknown) {
      results.push(`Index: ${(err as Error).message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_memory_embeddings_vector ON "memory_embeddings"
        USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
      `);
      results.push('Vector index created');
    } catch (err: unknown) {
      results.push(`Vector index: ${(err as Error).message}`);
    }

    let pgvectorAvailable = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM pg_extension WHERE extname = 'vector'`;
      pgvectorAvailable = true;
    } catch {}

    return NextResponse.json({
      success: true,
      pgvectorAvailable,
      results,
    });
  } catch (error) {
    console.error('[pgvector migration] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 },
    );
  }
}
