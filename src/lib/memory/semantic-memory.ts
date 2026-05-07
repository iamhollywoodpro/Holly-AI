import { prisma } from '@/lib/db';
import { cloudflareProvider } from '@/lib/ai/providers/free-providers';

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
  | 'audio'          // Audio HOLLY analyzed
  | 'music_critique' // A&R feedback and track analysis
  | 'industry_benchmark'; // High-fidelity industry hit properties

export interface SemanticSearchResult {
  id:         string;
  content:    string;
  type:       string;
  similarity: number;
  createdAt:  Date;
  metadata?:  unknown;
}

// ─── Embedding Logic ──────────────────────────────────────────────────────────

const TARGET_DIMENSION = 1024; // Cloudflare bge-large-en-v1.5 and Database schema

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
      signal: AbortSignal.timeout(10_000),
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
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Improved fallback: character n-gram + word hash hybrid vector (1024-dim)
 * Produces much better similarity than simple bag-of-words by capturing
 * character-level patterns AND word-level semantics.
 */
function embedFallback(text: string): number[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
  const words = normalized.split(' ').filter(w => w.length > 1);
  const vec = new Array(TARGET_DIMENSION).fill(0);

  // Word-level hashing (captures full word semantics)
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
       hash = ((hash << 5) + hash) ^ word.charCodeAt(i);
    }
    vec[Math.abs(hash) % TARGET_DIMENSION] += 1;
  }

  // Character 3-gram hashing (captures partial word matches like "music" / "musical")
  const chars = normalized.replace(/ /g, '');
  for (let i = 0; i <= chars.length - 3; i++) {
    const trigram = chars.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) + hash) + trigram.charCodeAt(j);
    }
    vec[Math.abs(hash) % TARGET_DIMENSION] += 0.5;
  }

  // Bigram word hashing (captures word co-occurrence)
  for (let i = 0; i < words.length - 1; i++) {
    const pair = words[i] + '_' + words[i + 1];
    let hash = 5381;
    for (let j = 0; j < pair.length; j++) {
      hash = ((hash << 5) + hash) ^ pair.charCodeAt(j);
    }
    vec[Math.abs(hash) % TARGET_DIMENSION] += 0.7;
  }

  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

function padOrTruncate(vec: number[], targetDim: number): number[] {
  if (vec.length === targetDim) return vec;
  if (vec.length > targetDim) return vec.slice(0, targetDim);
  return [...vec, ...new Array(targetDim - vec.length).fill(0)];
}

export async function embed(text: string): Promise<number[]> {
  // 1. Try Cloudflare (Free, Fast, 1024-dim native) - PRIMARY
  try {
    if (cloudflareProvider.isConfigured()) {
      const cfResult = await cloudflareProvider.generateEmbeddings([text.substring(0, 3000)]);
      if (cfResult && cfResult[0]) {
        return padOrTruncate(cfResult[0], TARGET_DIMENSION);
      }
    }
  } catch (err) {
    console.warn('[SemanticMemory] Cloudflare embedding failed:', (err as Error).message);
  }

  // 2. Try NVIDIA fallback (Free trial/tier)
  const nvidia = await embedWithNVIDIA(text);
  if (nvidia) return padOrTruncate(nvidia, TARGET_DIMENSION);

  // 3. Try Ollama (Local)
  const ollama = await embedWithOllama(text);
  if (ollama) return padOrTruncate(ollama, TARGET_DIMENSION);

  // 4. Final local fallback (Always works, $0, no network)
  console.warn('[SemanticMemory] Using internal hash-fallback embedding — quality will be degraded');
  return embedFallback(text);
}

// ─── Store memory ─────────────────────────────────────────────────────────────

import { checkMemorySimilarity, mergeMemories, detectActionItem, detectCreatorSpecific, getTopicFrequency } from '@/lib/memory/memory-deduplication';
import { addKnowledge } from '@/lib/intelligence/knowledge-graph';

export async function storeMemory(entry: MemoryEntry): Promise<string> {
  if (!entry.content || entry.content.length < 3) return 'too_short';
  
  try {
    // ── Step 1: Dedup check ──────────────────────────────────────────
    const dedup = await checkMemorySimilarity(entry.userId, entry.content);
    
    if (dedup.action === 'merge' && dedup.existingMemoryId) {
      await mergeMemories(dedup.existingMemoryId, entry.content, entry.metadata as Record<string, any>);
      console.log(`[SemanticMemory] 🔗 Merged into existing memory (similarity: ${dedup.similarity.toFixed(2)})`);
      return 'merged';
    }
    
    // ── Step 2: Score importance ─────────────────────────────────────
    const isAction = detectActionItem(entry.content);
    const isCreator = detectCreatorSpecific(entry.content);
    const topicFreq = entry.metadata?.topics 
      ? await getTopicFrequency(entry.userId, (entry.metadata.topics as string[])[0] || '')
      : 0;
    
    const importance = (() => {
      let score = 0.3;
      score += ((entry.metadata?.emotionalSignificance as number) || 0) * 0.2;
      if (isAction) score += 0.15;
      score += Math.min(0.15, topicFreq * 0.05);
      if (isCreator) score += 0.1;
      score += 0.05; // fresh memory gets small recency bonus
      return Math.min(1.0, Math.max(0.1, score));
    })();

    // ── Step 3: Store with importance metadata ───────────────────────
    const enrichedMetadata = {
      ...(entry.metadata as Record<string, unknown> || {}),
      importance,
      isActionItem: isAction,
      isCreatorSpecific: isCreator,
      dedupSimilarity: dedup.similarity,
      storedAt: new Date().toISOString(),
    };

    const vector = await embed(entry.content);

    // Use raw SQL to insert into pgvector column
    const result = await prisma.$executeRaw`
      INSERT INTO "memory_embeddings" ("id", "userId", "content", "type", "embedding", "metadata", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${entry.userId},
        ${entry.content},
        ${entry.type},
        ${JSON.stringify(vector)}::vector,
        ${JSON.stringify(enrichedMetadata)}::jsonb,
        NOW(),
        NOW()
      )
    `;
    
    if (result > 0) {
      console.log(`[SemanticMemory] ✅ Saved ${entry.type} memory (${entry.content.length} chars, importance: ${importance.toFixed(2)})`);
      
      // ── Step 4: Create knowledge graph node for important memories ──
      if (importance >= 0.6 && entry.content.length > 20) {
        try {
          await addKnowledge({
            entityType: entry.type === 'preference' ? 'user' : 
                        entry.type === 'goal' ? 'project' :
                        entry.type === 'code' ? 'pattern' : 'concept',
            name: entry.content.substring(0, 100).split(/[.!?]/)[0].trim(),
            description: entry.content.substring(0, 500),
            metadata: { memoryType: entry.type, importance, source: 'auto' },
            confidence: importance,
          });
        } catch (kgErr) {
          // Non-critical — knowledge graph is supplementary
          console.warn('[SemanticMemory] Knowledge graph node creation skipped:', (kgErr as Error).message);
        }
      }
      
      // ── Step 5: Link related memories ──────────────────────────────
      if (dedup.action === 'link' && dedup.existingMemoryId) {
        console.log(`[SemanticMemory] 🔗 Linked to existing memory ${dedup.existingMemoryId} (similarity: ${dedup.similarity.toFixed(2)})`);
      }
      
      return 'stored';
    }
    return 'failed';
  } catch (pgErr: unknown) {
    console.error('[SemanticMemory] ❌ Failed to store vector memory:', (pgErr as Error).message);
    return 'error';
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
  if (!query || query.length < 3) return [];
  
  const { limit = 8, threshold = 0.5 } = opts;
  
  try {
    const queryVec = await embed(query);

    // Cosine similarity search using pgvector <=> operator
    // 1 - (vec1 <=> vec2) = Cosine Similarity
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

    const filtered = rows.filter(r => r.similarity >= threshold);
    console.log(`[SemanticMemory] 🔍 Found ${filtered.length} relevant memories for query: "${query.substring(0, 30)}..."`);
    
    return filtered.map(r => ({ ...r, metadata: r.metadata ?? undefined }));

  } catch (err) {
    console.warn('[SemanticMemory] Search failed:', (err as Error).message);
    return [];
  }
}

// ─── Convenience: embed and store a chat exchange ─────────────────────────────

export async function rememberExchange(
  userId:            string,
  userMessage:       string,
  assistantResponse: string,
): Promise<void> {
  if (!userId || !userMessage || !assistantResponse) return;
  
  const combined = `User: ${userMessage}\nHOLLY: ${assistantResponse}`;
  await storeMemory({
    userId,
    content:  combined.substring(0, 4000),
    type:    'conversation',
    metadata: { 
      userMsgLength: userMessage.length,
      respLength: assistantResponse.length
    },
  });
}
