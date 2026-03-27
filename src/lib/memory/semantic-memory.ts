/**
 * HOLLY Semantic Memory — Phase 9C
 *
 * Replaces keyword/topic-score memory retrieval with true semantic embeddings.
 * Every conversation, insight, and learning event is embedded and stored
 * in pgvector. Retrieval uses cosine similarity — HOLLY recalls what's
 * CONCEPTUALLY relevant, not just keyword-matched.
 *
 * Architecture:
 *   1. Embed text → float32 vector via NVIDIA NIM or Ollama (both free)
 *   2. Store in MemoryEmbedding (PostgreSQL + pgvector extension)
 *   3. Retrieve via cosine similarity: <=> operator
 *
 * Embedding providers (in order of preference):
 *   a. NVIDIA NIM — nvidia/nv-embedqa-e5-v5 (free tier, 4096-dim)
 *   b. Ollama — nomic-embed-text (free, local, 768-dim)
 *   c. Fallback — simple TF-IDF style bag-of-words (always works, lower quality)
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  userId:    string;
  content:   string;
  type:      MemoryType;
  metadata?: Record<string, unknown>;
}

export type MemoryType =
  | 'conversation'   // Chat exchange
  | 'insight'        // HOLLY extracted insight about the user
  | 'learning'       // Something HOLLY learned autonomously
  | 'preference'     // User preference/taste signal
  | 'goal'           // User or HOLLY goal
  | 'fact'           // Factual knowledge
  | 'emotion'        // Emotional state/event
  | 'code'           // Code HOLLY wrote or reviewed
  | 'audio';         // Audio HOLLY analyzed

export interface SemanticSearchResult {
  id:         string;
  content:    string;
  type:       string;
  similarity: number;
  createdAt:  Date;
  metadata?:  unknown;
}

// ─── Embedding providers ──────────────────────────────────────────────────────

async function embedWithNVIDIA(text: string): Promise<number[] | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nv-embedqa-e5-v5',
        input: [text.substring(0, 2048)],
        input_type: 'passage',
        truncate: 'END',
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function embedWithOllama(text: string): Promise<number[] | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

  try {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:  'nomic-embed-text',
        prompt: text.substring(0, 2048),
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Simple fallback: bag-of-words hash vector (128-dim)
 * No external service needed, but lower quality retrieval.
 */
function embedFallback(text: string): number[] {
  const words  = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const vec    = new Array(128).fill(0);
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) + hash) ^ word.charCodeAt(i);
    }
    vec[Math.abs(hash) % 128] += 1;
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

/**
 * Get embedding vector for text using best available provider.
 */
export async function embed(text: string): Promise<number[]> {
  // Try NVIDIA first (free, high quality)
  const nvidia = await embedWithNVIDIA(text);
  if (nvidia) return nvidia;

  // Try Ollama (free, local)
  const ollama = await embedWithOllama(text);
  if (ollama) return ollama;

  // Fallback: simple hash vector
  console.warn('[SemanticMemory] Using fallback embedding — install Ollama or add NVIDIA_API_KEY for better recall');
  return embedFallback(text);
}

// ─── Store memory ─────────────────────────────────────────────────────────────

export async function storeMemory(entry: MemoryEntry): Promise<string> {
  const vector = await embed(entry.content);

  // Store via raw SQL since Prisma doesn't natively support pgvector type yet
  // The MemoryEmbedding table needs pgvector enabled (see migration note below)
  try {
    const result = await prisma.$executeRaw`
      INSERT INTO "memory_embeddings" ("id", "userId", "content", "type", "embedding", "metadata", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${entry.userId},
        ${entry.content},
        ${entry.type},
        ${JSON.stringify(vector)}::vector,
        ${JSON.stringify(entry.metadata ?? {})}::jsonb,
        NOW(),
        NOW()
      )
    `;
    return result > 0 ? 'stored' : 'failed';
  } catch (pgErr: unknown) {
    // pgvector not enabled or table doesn't exist yet — store as plain text fallback
    console.warn('[SemanticMemory] pgvector not available, storing as plain memory:', (pgErr as Error).message);

    // Fall back to LearningInsight as generic memory store
    if (entry.type === 'conversation' || entry.type === 'insight') {
      await prisma.learningInsight.create({
        data: {
          category:    'semantic_memory',
          insightType: entry.type,
          title:       entry.content.substring(0, 100),
          description: entry.content,
          evidence:    (entry.metadata ?? {}) as object,
          confidence:  0.7,
        },
      }).catch(() => {}); // Silent fail if schema differs
    }
    return 'fallback';
  }
}

// ─── Semantic search ──────────────────────────────────────────────────────────

export async function semanticSearch(
  userId: string,
  query:  string,
  opts: {
    limit?:     number;
    types?:     MemoryType[];
    threshold?: number;
  } = {},
): Promise<SemanticSearchResult[]> {
  const { limit = 8, threshold = 0.6 } = opts;
  const queryVec = await embed(query);

  try {
    // Cosine similarity search using pgvector <=> operator
    const rows = await prisma.$queryRaw<Array<{
      id: string; content: string; type: string;
      similarity: number; createdAt: Date; metadata: unknown;
    }>>`
      SELECT
        id, content, type, metadata, "createdAt",
        1 - (embedding <=> ${JSON.stringify(queryVec)}::vector) AS similarity
      FROM "memory_embeddings"
      WHERE "userId" = ${userId}
        ${opts.types?.length ? prisma.$queryRaw`AND type = ANY(${opts.types})` : prisma.$queryRaw``}
      ORDER BY embedding <=> ${JSON.stringify(queryVec)}::vector
      LIMIT ${limit}
    `;

    return rows
      .filter(r => r.similarity >= threshold)
      .map(r => ({ ...r, metadata: r.metadata ?? undefined }));

  } catch {
    // pgvector not available — fall back to topic-score memory
    return [];
  }
}

// ─── Convenience: embed and store a chat exchange ─────────────────────────────

export async function rememberExchange(
  userId:            string,
  userMessage:       string,
  assistantResponse: string,
): Promise<void> {
  const combined = `User: ${userMessage}\nHOLLY: ${assistantResponse}`;
  await storeMemory({
    userId,
    content:  combined.substring(0, 2000),
    type:    'conversation',
    metadata: { userMsg: userMessage.substring(0, 200) },
  });
}

// ─── Migration note ───────────────────────────────────────────────────────────
/*
 * To enable pgvector on Neon PostgreSQL:
 *
 * 1. Run in Neon SQL editor:
 *    CREATE EXTENSION IF NOT EXISTS vector;
 *
 * 2. Create the table:
 *    CREATE TABLE IF NOT EXISTS "memory_embeddings" (
 *      "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *      "userId"    TEXT NOT NULL,
 *      "content"   TEXT NOT NULL,
 *      "type"      TEXT NOT NULL DEFAULT 'conversation',
 *      "embedding" vector(4096),   -- NVIDIA NIM dim (use 768 for Ollama nomic-embed-text)
 *      "metadata"  JSONB DEFAULT '{}',
 *      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *    );
 *
 *    CREATE INDEX ON "memory_embeddings" USING ivfflat ("embedding" vector_cosine_ops)
 *      WITH (lists = 100);
 *    CREATE INDEX ON "memory_embeddings" ("userId");
 *
 * 3. Until that's done, the system gracefully falls back to the existing
 *    keyword-based memory system.
 */
