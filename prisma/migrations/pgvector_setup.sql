/**
 * HOLLY pgvector Migration — Enables Semantic Memory
 *
 * Run this SQL on your Neon PostgreSQL database to enable pgvector.
 *
 * Option 1: Neon SQL Editor (https://console.neon.tech)
 *   Copy and paste the SQL below into the SQL editor.
 *
 * Option 2: API Endpoint (automatic)
 *   POST /api/memory/migrate-pgvector
 *   This runs the same SQL programmatically.
 *
 * Option 3: psql
 *   psql "postgresql://..." -f prisma/migrations/pgvector_setup.sql
 */

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create the memory_embeddings table
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

-- Step 3: Create indexes for fast similarity search
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_userId ON "memory_embeddings" ("userId");
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_type ON "memory_embeddings" ("type");

-- IVFFlat index for cosine similarity (good for < 1M rows)
-- For larger datasets, switch to HNSW: USING hnsw (embedding vector_cosine_ops)
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_vector ON "memory_embeddings"
  USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Step 4: Verify
SELECT extname FROM pg_extension WHERE extname = 'vector';
