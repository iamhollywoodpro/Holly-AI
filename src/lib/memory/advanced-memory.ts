/**
 * Advanced Memory Architecture — Four-layer memory system
 *
 * Layers:
 * 1. Episodic: Full context replay of past events with emotional weight
 * 2. Working: Current conversation state, active context, scratchpad
 * 3. Procedural: Learned skills, patterns, and procedures
 * 4. Meta: Self-awareness of knowledge boundaries and confidence
 *
 * This transforms Holly's memory from text search to genuine understanding.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

// Layer 1: Episodic Memory
export interface EpisodicMemory {
  id: string;
  userId: string;
  timestamp: number;
  event: string;              // What happened
  context: string;            // Surrounding context
  emotionalWeight: number;    // 0-1, how emotionally significant
  participants: string[];     // Who was involved
  location: string;           // Where (virtual: 'chat', 'voice', 'code-review')
  outcome: string;            // What resulted
  topics: string[];           // Key topics discussed
  retrievalCount: number;     // How often this memory is recalled
  lastRetrievedAt: number | null;
  consolidationLevel: 'fragile' | 'stable' | 'permanent';
}

// Layer 2: Working Memory
export interface WorkingMemory {
  sessionId: string;
  userId: string;
  activeTopics: string[];
  currentUserEmotion: string | null;
  pendingQuestions: string[];
  activeGoals: string[];
  scratchpad: Map<string, string>;  // Temporary key-value store
  contextWindow: WorkingMemoryEntry[];
  lastUpdated: number;
}

export interface WorkingMemoryEntry {
  role: 'user' | 'holly' | 'system';
  content: string;
  timestamp: number;
  importance: number; // 0-1
}

// Layer 3: Procedural Memory
export interface ProceduralMemory {
  id: string;
  skillName: string;
  category: 'communication' | 'coding' | 'creative' | 'analysis' | 'social';
  steps: string[];
  triggers: string[];          // When to use this procedure
  successRate: number;         // 0-1
  executionCount: number;
  lastUsedAt: number;
  learnedFrom: string;         // Source of learning
  adaptations: string[];       // User-specific adaptations
}

// Layer 4: Meta Memory
export interface MetaMemory {
  domain: string;
  knowledgeLevel: 'none' | 'basic' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;          // 0-1
  lastAssessedAt: number;
  gaps: string[];              // What's missing
  strengths: string[];         // What's solid
  source: 'direct' | 'inferred' | 'reported';
}

export interface MemoryConsolidationResult {
  fragile: number;       // Memories needing reinforcement
  stabilized: number;    // Memories that became stable
  permanent: number;     // Memories that became permanent
  pruned: number;        // Memories that were forgotten
}

// ─── Episodic Memory Operations ─────────────────────────────────────────────

/**
 * Create a new episodic memory entry.
 */
export function createEpisodicMemory(
  userId: string,
  event: string,
  context: string,
  emotionalWeight: number,
  topics: string[] = [],
  participants: string[] = [],
  outcome: string = '',
): EpisodicMemory {
  return {
    id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    userId,
    timestamp: Date.now(),
    event,
    context,
    emotionalWeight: Math.max(0, Math.min(1, emotionalWeight)),
    participants,
    location: 'chat',
    outcome,
    topics,
    retrievalCount: 0,
    lastRetrievedAt: null,
    consolidationLevel: 'fragile',
  };
}

/**
 * Calculate the importance score for an episodic memory.
 * Used to determine which memories to consolidate vs prune.
 */
export function calculateMemoryImportance(memory: EpisodicMemory): number {
  let score = 0;

  // Emotional weight is the strongest signal
  score += memory.emotionalWeight * 0.35;

  // Retrieval count shows the memory is useful
  score += Math.min(1, memory.retrievalCount / 10) * 0.25;

  // Recency — newer memories are more important
  const ageHours = (Date.now() - memory.timestamp) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - ageHours / 720); // decay over 30 days
  score += recencyScore * 0.2;

  // Consolidation level — permanent memories are always important
  if (memory.consolidationLevel === 'permanent') score += 0.15;
  else if (memory.consolidationLevel === 'stable') score += 0.1;

  // Topics — memories with more topics are richer
  score += Math.min(0.05, memory.topics.length * 0.01);

  return Math.min(1, score);
}

/**
 * Consolidate episodic memories: promote fragile → stable → permanent.
 * Prune low-importance fragile memories.
 */
export function consolidateMemories(
  memories: EpisodicMemory[],
  importanceThreshold: number = 0.3,
): MemoryConsolidationResult {
  const result: MemoryConsolidationResult = { fragile: 0, stabilized: 0, permanent: 0, pruned: 0 };

  for (const memory of memories) {
    const importance = calculateMemoryImportance(memory);

    if (importance < importanceThreshold && memory.consolidationLevel === 'fragile') {
      // Prune low-importance fragile memories
      result.pruned++;
      continue;
    }

    switch (memory.consolidationLevel) {
      case 'fragile':
        if (memory.retrievalCount >= 2 || memory.emotionalWeight >= 0.7) {
          memory.consolidationLevel = 'stable';
          result.stabilized++;
        } else {
          result.fragile++;
        }
        break;

      case 'stable':
        if (memory.retrievalCount >= 5 || memory.emotionalWeight >= 0.9) {
          memory.consolidationLevel = 'permanent';
          result.permanent++;
        } else {
          result.stabilized++;
        }
        break;

      case 'permanent':
        result.permanent++;
        break;
    }
  }

  return result;
}

/**
 * Retrieve episodic memories relevant to a query.
 * Uses topic matching and emotional resonance.
 */
export function retrieveEpisodicMemories(
  memories: EpisodicMemory[],
  query: string,
  queryTopics: string[] = [],
  maxResults: number = 5,
): EpisodicMemory[] {
  const scored = memories.map(memory => {
    let score = 0;

    // Topic overlap
    const topicOverlap = memory.topics.filter(t =>
      queryTopics.some(qt => qt.toLowerCase() === t.toLowerCase()),
    ).length;
    score += topicOverlap * 0.3;

    // Text relevance (simple keyword matching)
    const queryWords = query.toLowerCase().split(/\s+/);
    const memoryText = `${memory.event} ${memory.context} ${memory.outcome}`.toLowerCase();
    const wordMatches = queryWords.filter(w => w.length > 3 && memoryText.includes(w)).length;
    score += wordMatches * 0.2;

    // Emotional resonance
    score += memory.emotionalWeight * 0.15;

    // Consolidation level (prefer stable/permanent)
    if (memory.consolidationLevel === 'permanent') score += 0.2;
    else if (memory.consolidationLevel === 'stable') score += 0.1;

    // Recency bonus
    const ageHours = (Date.now() - memory.timestamp) / (1000 * 60 * 60);
    score += Math.max(0, 0.15 * (1 - ageHours / 168)); // 1 week decay

    return { memory, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => {
      s.memory.retrievalCount++;
      s.memory.lastRetrievedAt = Date.now();
      return s.memory;
    });
}

// ─── Working Memory Operations ───────────────────────────────────────────────

/**
 * Create a new working memory session.
 */
export function createWorkingMemory(sessionId: string, userId: string): WorkingMemory {
  return {
    sessionId,
    userId,
    activeTopics: [],
    currentUserEmotion: null,
    pendingQuestions: [],
    activeGoals: [],
    scratchpad: new Map(),
    contextWindow: [],
    lastUpdated: Date.now(),
  };
}

/**
 * Add an entry to working memory context window.
 * Maintains a sliding window of the most important recent entries.
 */
export function addToContextWindow(
  working: WorkingMemory,
  role: WorkingMemoryEntry['role'],
  content: string,
  importance: number = 0.5,
  maxWindowSize: number = 20,
): void {
  working.contextWindow.push({
    role,
    content,
    timestamp: Date.now(),
    importance: Math.max(0, Math.min(1, importance)),
  });

  // Trim to max window size, keeping the most important entries
  if (working.contextWindow.length > maxWindowSize) {
    working.contextWindow.sort((a, b) => b.importance - a.importance);
    working.contextWindow = working.contextWindow.slice(0, maxWindowSize);
    working.contextWindow.sort((a, b) => a.timestamp - b.timestamp);
  }

  working.lastUpdated = Date.now();
}

/**
 * Update working memory with new topics.
 */
export function updateWorkingTopics(
  working: WorkingMemory,
  newTopics: string[],
): void {
  for (const topic of newTopics) {
    if (!working.activeTopics.includes(topic)) {
      working.activeTopics.push(topic);
    }
  }
  // Keep only the 10 most recent topics
  if (working.activeTopics.length > 10) {
    working.activeTopics = working.activeTopics.slice(-10);
  }
  working.lastUpdated = Date.now();
}

/**
 * Set a scratchpad value in working memory.
 */
export function setScratchpad(working: WorkingMemory, key: string, value: string): void {
  working.scratchpad.set(key, value);
  working.lastUpdated = Date.now();
}

/**
 * Get a scratchpad value from working memory.
 */
export function getScratchpad(working: WorkingMemory, key: string): string | undefined {
  return working.scratchpad.get(key);
}

// ─── Procedural Memory Operations ────────────────────────────────────────────

/**
 * Create a new procedural memory (learned skill).
 */
export function createProceduralMemory(
  skillName: string,
  category: ProceduralMemory['category'],
  steps: string[],
  triggers: string[],
  learnedFrom: string = 'experience',
): ProceduralMemory {
  return {
    id: `proc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    skillName,
    category,
    steps,
    triggers,
    successRate: 0.5, // Start neutral
    executionCount: 0,
    lastUsedAt: Date.now(),
    learnedFrom,
    adaptations: [],
  };
}

/**
 * Record a procedural memory execution result.
 * Updates success rate using exponential moving average.
 */
export function recordProceduralExecution(
  procedure: ProceduralMemory,
  success: boolean,
): void {
  const alpha = 0.3; // Learning rate
  procedure.successRate = procedure.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
  procedure.executionCount++;
  procedure.lastUsedAt = Date.now();
}

/**
 * Find relevant procedures for a given input.
 */
export function findRelevantProcedures(
  procedures: ProceduralMemory[],
  input: string,
  maxResults: number = 3,
): ProceduralMemory[] {
  const inputLower = input.toLowerCase();

  return procedures
    .map(proc => {
      let relevance = 0;

      // Trigger matching
      for (const trigger of proc.triggers) {
        if (inputLower.includes(trigger.toLowerCase())) {
          relevance += 0.4;
        }
      }

      // Skill name matching
      if (inputLower.includes(proc.skillName.toLowerCase())) {
        relevance += 0.3;
      }

      // Success rate bonus
      relevance += proc.successRate * 0.2;

      // Execution count shows reliability
      relevance += Math.min(0.1, proc.executionCount * 0.01);

      return { procedure: proc, relevance };
    })
    .filter(s => s.relevance > 0.2)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
    .map(s => s.procedure);
}

// ─── Meta Memory Operations ──────────────────────────────────────────────────

/**
 * Create a meta memory entry for a knowledge domain.
 */
export function createMetaMemory(
  domain: string,
  knowledgeLevel: MetaMemory['knowledgeLevel'] = 'none',
  confidence: number = 0,
  source: MetaMemory['source'] = 'inferred',
): MetaMemory {
  return {
    domain,
    knowledgeLevel,
    confidence: Math.max(0, Math.min(1, confidence)),
    lastAssessedAt: Date.now(),
    gaps: [],
    strengths: [],
    source,
  };
}

/**
 * Determine knowledge level from confidence score.
 */
export function confidenceToLevel(confidence: number): MetaMemory['knowledgeLevel'] {
  if (confidence >= 0.9) return 'expert';
  if (confidence >= 0.7) return 'advanced';
  if (confidence >= 0.5) return 'intermediate';
  if (confidence >= 0.2) return 'basic';
  return 'none';
}

/**
 * Assess knowledge gaps across domains.
 * Returns domains where Holly has low confidence.
 */
export function assessKnowledgeGaps(
  domains: MetaMemory[],
  confidenceThreshold: number = 0.5,
): MetaMemory[] {
  return domains.filter(d => d.confidence < confidenceThreshold);
}

/**
 * Generate a self-awareness report from meta memory.
 * Describes what Holly knows, doesn't know, and is unsure about.
 */
export function generateSelfAwarenessReport(domains: MetaMemory[]): {
  strongDomains: string[];
  weakDomains: string[];
  unknownDomains: string[];
  overallConfidence: number;
} {
  const strong = domains.filter(d => d.confidence >= 0.7).map(d => d.domain);
  const weak = domains.filter(d => d.confidence >= 0.2 && d.confidence < 0.7).map(d => d.domain);
  const unknown = domains.filter(d => d.confidence < 0.2).map(d => d.domain);
  const overallConfidence = domains.length > 0
    ? domains.reduce((sum, d) => sum + d.confidence, 0) / domains.length
    : 0;

  return {
    strongDomains: strong,
    weakDomains: weak,
    unknownDomains: unknown,
    overallConfidence,
  };
}

/**
 * Update meta memory confidence based on new evidence.
 * Uses Bayesian-inspired updating.
 */
export function updateMetaConfidence(
  meta: MetaMemory,
  evidenceStrength: number, // 0-1, how strong the evidence is
  positiveEvidence: boolean, // true = supports knowledge, false = contradicts
): void {
  const prior = meta.confidence;
  const likelihood = positiveEvidence ? evidenceStrength : (1 - evidenceStrength);
  const posterior = (prior * likelihood) / ((prior * likelihood) + ((1 - prior) * (1 - likelihood)));

  meta.confidence = Math.max(0, Math.min(1, posterior));
  meta.knowledgeLevel = confidenceToLevel(meta.confidence);
  meta.lastAssessedAt = Date.now();
}
