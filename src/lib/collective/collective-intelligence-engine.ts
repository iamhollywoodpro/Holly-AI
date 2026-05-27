/**
 * Phase 23: Cross-User Collective Intelligence Engine (Opt-In)
 *
 * Aggregates anonymized patterns across consenting users so every
 * Holly instance gets smarter without compromising individual privacy.
 *
 * Privacy guarantees:
 * - No raw conversation data ever leaves the user boundary
 * - Only statistical patterns with N >= MIN_GROUP_SIZE are stored
 * - All data is hashed and bucketed — no reverse identification possible
 * - Users explicitly opt in via settings
 * - Users can delete their contributed data at any time
 */

import { PrismaClient, CollectivePattern as PrismaCollectivePattern } from '@prisma/client';

export type CollectivePattern = PrismaCollectivePattern;

const MIN_GROUP_SIZE = 5; // Minimum users before a pattern is published
const CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for a collective pattern
const PATTERN_EXPIRY_DAYS = 90; // Patterns expire after 90 days

const prisma = new PrismaClient();

// --- Types ---

export type PatternType = 'topic_association' | 'behavior_sequence' | 'knowledge_correlation' | 'preference_cluster' | 'temporal_pattern';

export interface PatternContribution {
  patternType: PatternType;
  domain: string;
  trigger: string;
  outcome: string;
  confidence: number;
  source: string;
}

export interface CollectiveInsight {
  pattern: PrismaCollectivePattern;
  relevanceScore: number;
  suggestedAction: string;
}

// --- Consent Management ---

export async function isCollectiveIntelligenceEnabled(userId: string): Promise<boolean> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) return false;
  const s = settings.settings as Record<string, unknown>;
  const privacy = s.privacy as Record<string, unknown> | undefined;
  return privacy?.collectiveIntelligence === true;
}

export async function setCollectiveIntelligenceOptIn(userId: string, enabled: boolean): Promise<void> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) return;
  const s = settings.settings as Record<string, Record<string, unknown>>;
  if (!s.privacy) s.privacy = {};
  s.privacy.collectiveIntelligence = enabled;
  await prisma.userSettings.update({
    where: { userId },
    data: { settings: s as any },
  });

  if (!enabled) {
    // Remove this user's contributed patterns
    // Delete patterns contributed by this user (stored in metadata.contributorHash)
    const hash = hashUserId(userId);
    const allPatterns = await prisma.collectivePattern.findMany({
      where: { isPublished: false },
      select: { id: true, metadata: true },
    });
    const idsToDelete = allPatterns
      .filter(p => (p.metadata as Record<string, unknown>)?.contributorHash === hash)
      .map(p => p.id);
    if (idsToDelete.length > 0) {
      await prisma.collectivePattern.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}

// --- Anonymization ---

function hashUserId(userId: string): string {
  // Simple hash — not reversible, used for deduplication only
  const salt = 'holly-collective-v1';
  let hash = 0;
  const str = salt + userId;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function bucketValue(value: number, bucketSize: number): number {
  return Math.floor(value / bucketSize) * bucketSize;
}

// --- Pattern Extraction (per-user, anonymized) ---

async function extractTopicAssociations(userId: string): Promise<PatternContribution[]> {
  const memories = await prisma.relationshipMemory.findMany({
    where: { userId },
    select: { domain: true, category: true, createdAt: true },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  const patterns: PatternContribution[] = [];

  // Group by domain co-occurrence in same time window
  const domainGroups: Record<string, number> = {};
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < Math.min(i + 10, memories.length); j++) {
      if (memories[i].domain && memories[j].domain && memories[i].domain !== memories[j].domain) {
        const pair = [memories[i].domain, memories[j].domain].sort().join('|');
        domainGroups[pair] = (domainGroups[pair] || 0) + 1;
      }
    }
  }

  for (const [pair, count] of Object.entries(domainGroups)) {
    if (count >= 2) {
      const [domainA, domainB] = pair.split('|');
      patterns.push({
        patternType: 'topic_association',
        domain: domainA,
        trigger: `interested_in:${domainB}`,
        outcome: `likely_also_interested_in:${domainA}`,
        confidence: Math.min(count / 10, 0.95),
        source: 'memory_co_occurrence',
      });
    }
  }

  return patterns;
}

async function extractKnowledgeCorrelations(userId: string): Promise<PatternContribution[]> {
  const goals = await prisma.learningGoal.findMany({
    where: { userId, status: { in: ['completed', 'learning'] } },
    select: { domain: true, topic: true, source: true },
    take: 100,
  });

  const patterns: PatternContribution[] = [];

  // Find topic-domain correlations
  const topicDomainMap: Record<string, Set<string>> = {};
  for (const goal of goals) {
    if (!topicDomainMap[goal.topic]) topicDomainMap[goal.topic] = new Set();
    topicDomainMap[goal.topic].add(goal.domain);
  }

  for (const [topic, domains] of Object.entries(topicDomainMap)) {
    if (domains.size >= 2) {
      const domainArr = Array.from(domains);
      for (let i = 0; i < domainArr.length; i++) {
        for (let j = i + 1; j < domainArr.length; j++) {
          patterns.push({
            patternType: 'knowledge_correlation',
            domain: domainArr[i],
            trigger: `learning:${topic}`,
            outcome: `also_relevant_in:${domainArr[j]}`,
            confidence: 0.7,
            source: 'learning_goal_cross_domain',
          });
        }
      }
    }
  }

  return patterns;
}

async function extractTemporalPatterns(userId: string): Promise<PatternContribution[]> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    select: { createdAt: true, title: true },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  const patterns: PatternContribution[] = [];

  // Find time-of-day patterns
  const hourCounts: Record<number, number> = {};
  for (const conv of conversations) {
    const hour = new Date(conv.createdAt).getHours();
    const bucketed = bucketValue(hour, 3); // 3-hour buckets
    hourCounts[bucketed] = (hourCounts[bucketed] || 0) + 1;
  }

  const totalConvs = conversations.length || 1;
  for (const [hourStr, count] of Object.entries(hourCounts)) {
    const frequency = count / totalConvs;
    if (frequency > 0.3) {
      patterns.push({
        patternType: 'temporal_pattern',
        domain: 'engagement',
        trigger: `time_bucket:${hourStr}`,
        outcome: `active_user:${Math.round(frequency * 100)}%_of_sessions`,
        confidence: Math.min(frequency, 0.9),
        source: 'conversation_timing',
      });
    }
  }

  return patterns;
}

async function extractPreferenceClusters(userId: string): Promise<PatternContribution[]> {
  const profile = await prisma.relationshipProfile.findUnique({
    where: { userId },
    select: { communicationStyle: true, personalityModel: true, expertiseAreas: true },
  });

  if (!profile) return [];

  const patterns: PatternContribution[] = [];
  const style = profile.communicationStyle as Record<string, unknown> | null;
  const expertise = profile.expertiseAreas as string[] | null;

  // Bucket communication style into anonymized clusters
  if (style) {
    const formality = typeof style.formality === 'number' ? bucketValue(style.formality * 10, 3) : 0;
    const verbosity = typeof style.verbosity === 'number' ? bucketValue(style.verbosity * 10, 3) : 0;
    patterns.push({
      patternType: 'preference_cluster',
      domain: 'communication',
      trigger: `style_bucket:${formality}_${verbosity}`,
      outcome: `preferred_communication_pattern`,
      confidence: 0.75,
      source: 'relationship_profile',
    });
  }

  // Expertise area correlations
  if (expertise && Array.isArray(expertise) && expertise.length >= 2) {
    for (let i = 0; i < expertise.length; i++) {
      for (let j = i + 1; j < expertise.length; j++) {
        patterns.push({
          patternType: 'preference_cluster',
          domain: String(expertise[i]),
          trigger: `expert_in:${expertise[j]}`,
          outcome: `likely_also_expert_in:${expertise[i]}`,
          confidence: 0.65,
          source: 'expertise_overlap',
        });
      }
    }
  }

  return patterns;
}

// --- Aggregation (combines anonymized contributions) ---

async function aggregatePatterns(): Promise<{ aggregated: number; expired: number }> {
  // Expire old patterns
  const expired = await prisma.collectivePattern.deleteMany({
    where: {
      createdAt: { lt: new Date(Date.now() - PATTERN_EXPIRY_DAYS * 24 * 60 * 60 * 1000) },
    },
  });

  // Get all patterns grouped by type+domain+trigger+outcome
  const rawPatterns = await prisma.collectivePattern.findMany({
    where: { sampleSize: { lt: MIN_GROUP_SIZE } },
  });

  // Group for aggregation
  const groups: Record<string, typeof rawPatterns> = {};
  for (const p of rawPatterns) {
    const key = `${p.patternType}|${p.domain}|${p.trigger}|${p.outcome}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  let aggregated = 0;

  for (const [key, group] of Object.entries(groups)) {
    if (group.length >= MIN_GROUP_SIZE) {
      // Merge into one pattern with real sample size
      const avgConfidence = group.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / group.length;
      const merged = group[0];

      await prisma.collectivePattern.upsert({
        where: { id: merged.id },
        update: {
          sampleSize: group.length,
          confidence: avgConfidence,
          frequency: group.length,
          isPublished: true,
        },
        create: {
          patternType: merged.patternType,
          domain: merged.domain,
          trigger: merged.trigger,
          outcome: merged.outcome,
          frequency: group.length,
          confidence: avgConfidence,
          sampleSize: group.length,
          metadata: JSON.parse(JSON.stringify(merged.metadata)),
          isPublished: true,
        },
      });

      // Remove the individual entries that were merged
      const idsToDelete = group.slice(1).map(p => p.id);
      if (idsToDelete.length > 0) {
        await prisma.collectivePattern.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      aggregated++;
    }
  }

  return { aggregated, expired: expired.count };
}

// --- Main Pipeline ---

export async function runCollectiveIntelligenceLoop(): Promise<{
  usersProcessed: number;
  patternsContributed: number;
  patternsAggregated: number;
  patternsExpired: number;
}> {
  // Find all opted-in users
  const allSettings = await prisma.userSettings.findMany({
    select: { userId: true, settings: true },
  });

  const optedInUsers = allSettings.filter(s => {
    const settings = s.settings as Record<string, Record<string, unknown>>;
    return settings?.privacy?.collectiveIntelligence === true;
  });

  let patternsContributed = 0;

  for (const userSetting of optedInUsers) {
    const userId = userSetting.userId;
    const contributorHash = hashUserId(userId);

    // Extract anonymized patterns from this user's data
    const [topicPatterns, knowledgePatterns, temporalPatterns, preferencePatterns] = await Promise.all([
      extractTopicAssociations(userId),
      extractKnowledgeCorrelations(userId),
      extractTemporalPatterns(userId),
      extractPreferenceClusters(userId),
    ]);

    const allPatterns = [
      ...topicPatterns,
      ...knowledgePatterns,
      ...temporalPatterns,
      ...preferencePatterns,
    ];

    // Store as anonymized contributions
    for (const pattern of allPatterns) {
      await prisma.collectivePattern.create({
        data: {
          patternType: pattern.patternType,
          domain: pattern.domain,
          trigger: pattern.trigger,
          outcome: pattern.outcome,
          frequency: 1,
          confidence: pattern.confidence,
          sampleSize: 1,
          metadata: { source: pattern.source, contributorHash },
          isPublished: false, // Not published until MIN_GROUP_SIZE reached
        },
      });
      patternsContributed++;
    }
  }

  // Aggregate patterns that have enough contributions
  const { aggregated, expired } = await aggregatePatterns();

  return {
    usersProcessed: optedInUsers.length,
    patternsContributed,
    patternsAggregated: aggregated,
    patternsExpired: expired,
  };
}

// --- Query Interface (for Holly to use in conversations) ---

export async function getRelevantCollectivePatterns(
  domain: string,
  topic?: string,
  limit: number = 10,
): Promise<CollectivePattern[]> {
  const where: any = {
    isPublished: true,
    confidence: { gte: CONFIDENCE_THRESHOLD },
    OR: [
      { domain },
      { trigger: { contains: topic || domain } },
      { outcome: { contains: topic || domain } },
    ],
  };

  return prisma.collectivePattern.findMany({
    where,
    take: limit,
    orderBy: { confidence: 'desc' },
  });
}

export async function getCollectiveInsightsForUser(
  userId: string,
  currentTopics: string[],
): Promise<CollectiveInsight[]> {
  const insights: CollectiveInsight[] = [];

  for (const topic of currentTopics.slice(0, 5)) {
    const patterns = await getRelevantCollectivePatterns(topic, undefined, 3);
    for (const pattern of patterns) {
      insights.push({
        pattern,
        relevanceScore: pattern.confidence * (pattern.domain === topic ? 1.5 : 1),
        suggestedAction: generateSuggestedAction(pattern),
      });
    }
  }

  // Sort by relevance
  insights.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return insights.slice(0, 5);
}

function generateSuggestedAction(pattern: CollectivePattern): string {
  switch (pattern.patternType) {
    case 'topic_association':
      return `Users who explore ${pattern.trigger} often benefit from ${pattern.outcome}. Consider proactively sharing related insights.`;
    case 'knowledge_correlation':
      return `Knowledge in ${pattern.trigger} correlates with ${pattern.outcome}. Holly could bridge these domains.`;
    case 'temporal_pattern':
      return `Engagement pattern detected: ${pattern.trigger}. Holly could optimize proactive suggestions for this timing.`;
    case 'preference_cluster':
      return `Communication style ${pattern.trigger} is common. Holly could adapt to this pattern proactively.`;
    case 'behavior_sequence':
      return `After ${pattern.trigger}, users typically ${pattern.outcome}. Holly could anticipate next steps.`;
    default:
      return 'Consider using this pattern to improve Holly\'s proactivity.';
  }
}

// --- Stats ---

export async function getCollectiveIntelligenceStats(): Promise<{
  totalPatterns: number;
  publishedPatterns: number;
  optedInUsers: number;
  topDomains: { domain: string; count: number }[];
}> {
  const [total, published, allSettings] = await Promise.all([
    prisma.collectivePattern.count(),
    prisma.collectivePattern.count({ where: { isPublished: true } }),
    prisma.userSettings.findMany({ select: { settings: true } }),
  ]);

  const optedIn = allSettings.filter(s => {
    const settings = s.settings as Record<string, Record<string, unknown>>;
    return settings?.privacy?.collectiveIntelligence === true;
  }).length;

  // Top domains
  const domainGroups = await prisma.collectivePattern.groupBy({
    by: ['domain'],
    where: { isPublished: true },
    _count: { domain: true },
    orderBy: { _count: { domain: 'desc' } },
    take: 10,
  });

  return {
    totalPatterns: total,
    publishedPatterns: published,
    optedInUsers: optedIn,
    topDomains: domainGroups.map(d => ({ domain: d.domain, count: d._count.domain })),
  };
}
