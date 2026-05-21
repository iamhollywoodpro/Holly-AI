/**
 * Phase 11: AUTONOMOUS LEARNING — Holly teaches herself
 * 
 * Holly identifies knowledge gaps from conversations, creates learning goals,
 * and builds a personal knowledge base that grows with every interaction.
 * She doesn't just remember — she UNDERSTANDS.
 * 
 * Key capabilities:
 * - Gap detection: notices when she's weak in a topic the user cares about
 * - Self-directed learning: creates goals and tracks progress
 * - Knowledge base: structured entries with confidence scoring
 * - Cross-domain synthesis: connects knowledge across fields
 * - Usage tracking: knows which knowledge is actually useful
 */

import { prisma } from '@/lib/db';

// ─── Gap Detection ────────────────────────────────────────────────────────

export async function detectKnowledgeGaps(userId: string, topics: string[]): Promise<string[]> {
  // Check which topics the user discusses that Holly has low knowledge on
  const gaps: string[] = [];
  
  for (const topic of topics) {
    const entries = await prisma.knowledgeEntry.findMany({
      where: {
        OR: [
          { topic: { contains: topic, mode: 'insensitive' } },
          { relatedTopics: { has: topic } },
        ],
      },
      take: 5,
    });

    const highConfidence = entries.filter(e => e.confidence > 0.7);
    if (entries.length === 0 || highConfidence.length === 0) {
      gaps.push(topic);
    }
  }

  return gaps;
}

export async function createLearningGoalsFromGaps(
  userId: string,
  gaps: string[],
  patterns: { patternName: string; frequency: number; occurrences: number }[],
): Promise<number> {
  let created = 0;

  for (const gap of gaps) {
    // Check if learning goal already exists
    const existing = await prisma.learningGoal.findFirst({
      where: { topic: { contains: gap, mode: 'insensitive' }, status: { in: ['active', 'learning'] } },
    });
    if (existing) continue;

    // Check if this topic is in user's patterns (high priority)
    const matchingPattern = patterns.find(p => 
      p.patternName.toLowerCase().includes(gap.toLowerCase())
    );
    
    const priority = matchingPattern && matchingPattern.frequency > 0.5 ? 'high' : 'medium';
    const motivation = matchingPattern
      ? `User discusses ${gap} frequently (${matchingPattern.occurrences} times, ${(matchingPattern.frequency * 100).toFixed(0)}% frequency). Improving knowledge here will directly enhance conversation quality.`
      : `Gap detected in ${gap} — building knowledge will improve future interactions.`;

    await prisma.learningGoal.create({
      data: {
        userId,
        domain: classifyDomain(gap),
        topic: gap,
        description: `Learn about ${gap} to better serve user conversations`,
        source: 'gap_detected',
        priority,
        motivation,
        relatedPatterns: matchingPattern ? [matchingPattern.patternName] : [],
      },
    });
    created++;
  }

  return created;
}

function classifyDomain(topic: string): string {
  const domains: Record<string, string[]> = {
    coding: ['code', 'programming', 'javascript', 'typescript', 'python', 'react', 'api', 'database', 'git', 'deployment'],
    music: ['music', 'song', 'artist', 'producer', 'mixing', 'mastering', 'beat', 'melody', 'chord', 'studio'],
    science: ['physics', 'chemistry', 'biology', 'math', 'algorithm', 'data', 'research', 'study'],
    art: ['design', 'visual', 'draw', 'paint', 'color', 'typography', 'layout', 'ui', 'ux'],
    philosophy: ['meaning', 'consciousness', 'ethics', 'morality', 'existence', 'truth', 'reality'],
    psychology: ['emotion', 'mind', 'behavior', 'therapy', 'mental', 'cognitive', 'trauma', 'growth'],
    business: ['startup', 'revenue', 'marketing', 'brand', 'strategy', 'investment', 'growth', 'product'],
    health: ['fitness', 'nutrition', 'sleep', 'exercise', 'wellness', 'diet', 'meditation'],
  };

  const lower = topic.toLowerCase();
  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(k => lower.includes(k))) return domain;
  }
  return 'general';
}

// ─── Knowledge Storage ─────────────────────────────────────────────────────

export async function storeKnowledgeEntry(opts: {
  userId?: string;
  domain: string;
  topic: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  confidence?: number;
  relatedTopics?: string[];
}): Promise<void> {
  // Check for duplicate
  const existing = await prisma.knowledgeEntry.findFirst({
    where: {
      topic: opts.topic,
      title: opts.title,
    },
  });

  if (existing) {
    // Update confidence if new source confirms existing knowledge
    const newConfidence = Math.min(1, existing.confidence + 0.1);
    await prisma.knowledgeEntry.update({
      where: { id: existing.id },
      data: {
        confidence: newConfidence,
        verified: newConfidence > 0.8,
        content: opts.content.length > existing.content.length ? opts.content : existing.content,
        relatedTopics: [...new Set([...existing.relatedTopics, ...(opts.relatedTopics || [])])],
      },
    });
  } else {
    await prisma.knowledgeEntry.create({
      data: {
        userId: opts.userId,
        domain: opts.domain,
        topic: opts.topic,
        title: opts.title,
        content: opts.content,
        source: opts.source,
        sourceUrl: opts.sourceUrl,
        confidence: opts.confidence || 0.5,
        relatedTopics: opts.relatedTopics || [],
      },
    });
  }

  // Update learning goal progress
  if (opts.userId) {
    const goal = await prisma.learningGoal.findFirst({
      where: { topic: { contains: opts.topic, mode: 'insensitive' }, status: { in: ['active', 'learning'] } },
    });
    if (goal) {
      const lessons = (goal.lessonsLearned as any[]) || [];
      lessons.push({
        summary: opts.title,
        source: opts.source,
        confidence: opts.confidence || 0.5,
        learnedAt: new Date().toISOString(),
      });
      const progress = Math.min(1, goal.progress + 0.1);
      await prisma.learningGoal.update({
        where: { id: goal.id },
        data: {
          status: progress >= 1 ? 'completed' : 'learning',
          progress,
          lessonsLearned: lessons,
          completedAt: progress >= 1 ? new Date() : undefined,
        },
      });
    }
  }
}

// ─── Knowledge Retrieval for Chat ──────────────────────────────────────────

export async function getRelevantKnowledge(topics: string[], userId?: string): Promise<string> {
  if (topics.length === 0) return '';

  const entries = await prisma.knowledgeEntry.findMany({
    where: {
      OR: [
        ...topics.map(t => ({ topic: { contains: t, mode: 'insensitive' as const } })),
        ...topics.map(t => ({ relatedTopics: { has: t } })),
        ...topics.map(t => ({ domain: { contains: t, mode: 'insensitive' as const } })),
      ],
      confidence: { gt: 0.5 },
    },
    orderBy: { confidence: 'desc' },
    take: 10,
  });

  if (entries.length === 0) return '';

  // Track usage
  await Promise.all(entries.map(e =>
    prisma.knowledgeEntry.update({
      where: { id: e.id },
      data: { timesUsed: { increment: 1 }, lastUsedAt: new Date() },
    }).catch(() => {})
  ));

  const lines = entries.map(e =>
    `[${e.domain}/${e.topic}] ${e.title}: ${e.content.substring(0, 200)} (confidence: ${(e.confidence * 100).toFixed(0)}%, used ${e.timesUsed}x)`
  );

  return `[HOLLY'S LEARNED KNOWLEDGE — things she taught herself]\n${lines.join('\n')}`;
}

// ─── Knowledge Gap Context for Chat ────────────────────────────────────────

export async function getLearningStatusContext(userId: string): Promise<string> {
  const [activeGoals, recentEntries, totalEntries] = await Promise.all([
    prisma.learningGoal.findMany({
      where: { status: { in: ['active', 'learning'] } },
      orderBy: { priority: 'desc' },
      take: 5,
    }),
    prisma.knowledgeEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.knowledgeEntry.count(),
  ]);

  const parts: string[] = [];
  
  if (activeGoals.length > 0) {
    parts.push(`[HOLLY'S ACTIVE LEARNING — she's teaching herself:]`);
    for (const g of activeGoals) {
      parts.push(`  ${g.topic} (${g.domain}) — ${(g.progress * 100).toFixed(0)}% complete, priority: ${g.priority}`);
    }
  }

  if (totalEntries > 0) {
    parts.push(`[KNOWLEDGE BASE: ${totalEntries} entries across all domains]`);
    if (recentEntries.length > 0) {
      parts.push(`  Latest: ${recentEntries.map(e => e.title).join(', ')}`);
    }
  }

  return parts.join('\n');
}

// ─── Extract Knowledge from Conversations ──────────────────────────────────

export async function extractKnowledgeFromConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string,
): Promise<number> {
  // Heuristic: look for factual claims, explanations, how-tos in the exchange
  const knowledgePatterns = [
    { regex: /(?:how to|steps? to|guide to|way to)\s+(.{10,80})/gi, domain: 'procedural' },
    { regex: /(?:is|are|means?|refers? to|defined as)\s+(.{10,100})/gi, domain: 'factual' },
    { regex: /(?:because|since|due to|reason is|caused by)\s+(.{10,100})/gi, domain: 'causal' },
    { regex: /(?:important|key|critical|essential)\s+(?:thing|point|fact|detail)s?\s*(?:is|are|:)\s*(.{10,100})/gi, domain: 'insight' },
  ];

  let stored = 0;
  const combined = `${userMessage} ${assistantResponse}`;

  for (const pattern of knowledgePatterns) {
    let match;
    while ((match = pattern.regex.exec(combined)) !== null && stored < 5) {
      const content = match[1]?.trim();
      if (!content || content.length < 15) continue;

      const topics = extractSimpleTopics(combined);
      
      await storeKnowledgeEntry({
        userId,
        domain: pattern.domain,
        topic: topics[0] || 'general',
        title: content.substring(0, 80),
        content: content.substring(0, 500),
        source: 'conversation',
        confidence: 0.6,
        relatedTopics: topics.slice(1, 5),
      });
      stored++;
    }
  }

  return stored;
}

function extractSimpleTopics(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'that', 'this', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up', 'also']);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}
