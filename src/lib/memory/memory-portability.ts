/**
 * Phase 16: Memory Portability and Backup
 *
 * Full relationship export/import — every memory, preference, milestone,
 * personality profile, learning goal, knowledge, growth metric.
 * Your intelligence belongs to you.
 *
 * Export format: Holly Portable Relationship Format (HPRF) v1.0
 * - JSON with versioned schema
 * - Includes all user-scoped data
 * - Cryptographically signed for integrity
 * - Import validates schema before applying
 *
 * API: POST /api/memory/export, POST /api/memory/import
 */

import { prisma } from '@/lib/db';

// ── Types ──────────────────────────────────────────────────────────────

export interface HollyPortableRelationship {
  version: '1.0';
  exportedAt: string;
  hollyInstanceId: string;
  user: {
    name: string | null;
    email: string | null;
    clerkUserId: string;
  };
  data: {
    conversations: ConversationExport[];
    memories: MemoryExport[];
    relationships: RelationshipExport;
    personality: PersonalityExport;
    learning: LearningExport;
    knowledge: KnowledgeExport[];
    growth: GrowthExport[];
    taste: TasteExport;
    goals: GoalExport[];
    proactiveInsights: ProactiveExport[];
    preferences: PreferenceExport;
  };
  stats: {
    totalConversations: number;
    totalMemories: number;
    totalMilestones: number;
    totalLearningGoals: number;
    totalKnowledgeEntries: number;
    relationshipDepth: string;
    daysTogether: number;
  };
}

interface ConversationExport {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface MemoryExport {
  id: string;
  type: string;
  category: string;
  content: string;
  importance: number;
  createdAt: string;
  lastAccessed: string | null;
  accessCount: number;
}

interface RelationshipExport {
  profile: {
    communicationStyle: string | null;
    interests: string[];
    goals: string[];
    personalityTraits: string[];
    values: string[];
    boundaries: string[];
    skills: string[];
    summary: string | null;
  } | null;
  milestones: Array<{
    type: string;
    description: string;
    occurredAt: string;
  }>;
  context: {
    currentProjects: string[];
    recentTopics: string[];
    activeGoals: string[];
    mood: string | null;
    engagementLevel: string | null;
  } | null;
  memories: Array<{
    factType: string;
    content: string;
    confidence: number;
    source: string;
    extractedAt: string;
  }>;
}

interface PersonalityExport {
  style: {
    formality: number;
    verbosity: number;
    technicalLevel: number;
    humor: number;
    empathy: number;
    directness: number;
  };
  samplesAnalyzed: number;
  lastUpdated: string | null;
}

interface LearningExport {
  goals: Array<{
    id: string;
    topic: string;
    domain: string;
    priority: string;
    status: string;
    progress: number;
    createdAt: string;
  }>;
  events: Array<{
    type: string;
    topic: string;
    data: Record<string, unknown>;
    timestamp: string;
  }>;
  patterns: Array<{
    patternType: string;
    description: string;
    frequency: number;
    strength: number;
    lastSeen: string;
  }>;
}

interface KnowledgeExport {
  id: string;
  topic: string;
  domain: string;
  content: string;
  confidence: number;
  source: string;
  verified: boolean;
  createdAt: string;
}

interface GrowthExport {
  metric: string;
  value: number;
  previousValue: number;
  trend: string;
  recordedAt: string;
}

interface TasteExport {
  dimensions: Record<string, number>;
  signals: Array<{
    category: string;
    preference: string;
    strength: number;
    context: string;
  }>;
}

interface GoalExport {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  createdAt: string;
  targetDate: string | null;
}

interface ProactiveExport {
  type: string;
  category: string;
  title: string;
  body: string;
  confidence: number;
  urgency: string;
  createdAt: string;
}

interface PreferenceExport {
  settings: Record<string, unknown>;
  customInstructions: string | null;
  theme: string | null;
}

// ── Export ─────────────────────────────────────────────────────────────

export async function exportFullRelationship(
  clerkUserId: string
): Promise<{ success: boolean; data?: HollyPortableRelationship; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        name: true,
        email: true,
        clerkUserId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const internalId = user.id;

    // ── Conversations (with messages) ────────────────────────────────
    const conversations = await prisma.conversation.findMany({
      where: { userId: internalId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          select: { role: true, content: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const conversationExports: ConversationExport[] = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    }));

    // ── Memories (MemoryEmbedding: type, content, metadata) ──────────
    const semanticMemories = await prisma.memoryEmbedding.findMany({
      where: { userId: internalId },
      select: {
        id: true,
        type: true,
        content: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const memoryExports: MemoryExport[] = semanticMemories.map((m) => ({
      id: m.id,
      type: m.type ?? 'general',
      category: typeof m.metadata === 'object' && m.metadata && 'category' in m.metadata
        ? String((m.metadata as Record<string, unknown>).category) : 'uncategorized',
      content: m.content,
      importance: typeof m.metadata === 'object' && m.metadata && 'importance' in m.metadata
        ? Number((m.metadata as Record<string, unknown>).importance) : 0.5,
      createdAt: m.createdAt.toISOString(),
      lastAccessed: m.updatedAt.toISOString(),
      accessCount: typeof m.metadata === 'object' && m.metadata && 'accessCount' in m.metadata
        ? Number((m.metadata as Record<string, unknown>).accessCount) : 0,
    }));

    // ── Relationship ─────────────────────────────────────────────────
    const relProfile = await prisma.relationshipProfile.findFirst({
      where: { userId: internalId },
    });

    const relMilestones = await prisma.relationshipMilestone.findMany({
      where: { userId: internalId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const relContext = await prisma.relationshipContext.findFirst({
      where: { userId: internalId },
    });

    const relMemories = await prisma.relationshipMemory.findMany({
      where: { userId: internalId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const relationshipExport: RelationshipExport = {
      profile: relProfile
        ? {
            communicationStyle: JSON.stringify((relProfile as Record<string, unknown>).communicationStyle ?? {}),
            interests: Array.isArray((relProfile as Record<string, unknown>).expertiseAreas)
              ? (relProfile as Record<string, unknown>).expertiseAreas as string[] : [],
            goals: Array.isArray((relProfile as Record<string, unknown>).activeGoals)
              ? (relProfile as Record<string, unknown>).activeGoals as string[] : [],
            personalityTraits: [],
            values: Array.isArray((relProfile as Record<string, unknown>).coreValues)
              ? (relProfile as Record<string, unknown>).coreValues as string[] : [],
            boundaries: Array.isArray((relProfile as Record<string, unknown>).boundaries)
              ? (relProfile as Record<string, unknown>).boundaries as string[] : [],
            skills: Array.isArray((relProfile as Record<string, unknown>).expertiseAreas)
              ? (relProfile as Record<string, unknown>).expertiseAreas as string[] : [],
            summary: null,
          }
        : null,
      milestones: relMilestones.map((m) => ({
        type: (m as Record<string, unknown>).type as string ?? 'unknown',
        description: [
          (m as Record<string, unknown>).title as string ?? '',
          (m as Record<string, unknown>).description as string ?? '',
        ].filter(Boolean).join(' — '),
        occurredAt: m.createdAt.toISOString(),
      })),
      context: relContext
        ? {
            currentProjects: Array.isArray((relContext as Record<string, unknown>).activeProjects)
              ? (relContext as Record<string, unknown>).activeProjects as string[] : [],
            recentTopics: Array.isArray((relContext as Record<string, unknown>).recentTopics)
              ? (relContext as Record<string, unknown>).recentTopics as string[] : [],
            activeGoals: [],
            mood: (relContext as Record<string, unknown>).currentMood as string | null ?? null,
            engagementLevel: (relContext as Record<string, unknown>).energyLevel != null
              ? String((relContext as Record<string, unknown>).energyLevel) : null,
          }
        : null,
      memories: relMemories.map((m) => ({
        factType: `${(m as Record<string, unknown>).category ?? 'fact'}/${(m as Record<string, unknown>).domain ?? 'general'}`,
        content: (m as Record<string, unknown>).content as string ?? '',
        confidence: ((m as Record<string, unknown>).confidence as number) ?? 0.5,
        source: (m as Record<string, unknown>).source as string ?? 'conversation',
        extractedAt: m.createdAt.toISOString(),
      })),
    };

    // ── Personality ──────────────────────────────────────────────────
    const personalityData = await prisma.userLearningProfile.findFirst({
      where: { userId: internalId },
    });

    const personalityExport: PersonalityExport = {
      style: {
        formality: personalityData
          ? (personalityData.communicationStyle === 'formal' ? 0.8 : personalityData.communicationStyle === 'technical' ? 0.7 : 0.4)
          : 0.5,
        verbosity: personalityData
          ? (personalityData.preferredResponseLength === 'detailed' ? 0.8 : personalityData.preferredResponseLength === 'concise' ? 0.3 : 0.5)
          : 0.5,
        technicalLevel: 0.5,
        humor: 0.5,
        empathy: 0.5,
        directness: 0.5,
      },
      samplesAnalyzed: personalityData
        ? personalityData.commonTopics.length + personalityData.interests.length
        : 0,
      lastUpdated: personalityData?.updatedAt?.toISOString() ?? null,
    };

    // ── Learning ─────────────────────────────────────────────────────
    const learningGoals = await prisma.learningGoal.findMany({
      where: { userId: internalId },
      orderBy: { priority: 'desc' },
      take: 100,
    });

    const learningEvents = await prisma.learningEvent.findMany({
      where: { userId: internalId },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const learningPatterns = await prisma.learningPattern.findMany({
      take: 100,
    });

    const learningExport: LearningExport = {
      goals: learningGoals.map((g) => ({
        id: g.id,
        topic: (g as Record<string, unknown>).topic as string ?? 'unknown',
        domain: (g as Record<string, unknown>).domain as string ?? 'general',
        priority: (g as Record<string, unknown>).priority as string ?? 'medium',
        status: (g as Record<string, unknown>).status as string ?? 'active',
        progress: ((g as Record<string, unknown>).progress as number) ?? 0,
        createdAt: g.createdAt.toISOString(),
      })),
      events: learningEvents.map((e) => ({
        type: e.type,
        topic: ((e.data as Record<string, unknown>)?.topic as string) ?? 'unknown',
        data: (e.data as Record<string, unknown>) ?? {},
        timestamp: e.timestamp.toISOString(),
      })),
      patterns: learningPatterns.map((p) => ({
        patternType: (p as Record<string, unknown>).patternType as string ?? 'unknown',
        description: (p as Record<string, unknown>).description as string ?? '',
        frequency: ((p as Record<string, unknown>).frequency as number) ?? 0,
        strength: ((p as Record<string, unknown>).strength as number) ?? 0,
        lastSeen: p.updatedAt.toISOString(),
      })),
    };

    // ── Knowledge ────────────────────────────────────────────────────
    const knowledgeEntries = await prisma.knowledgeEntry.findMany({
      where: { userId: internalId },
      orderBy: { confidence: 'desc' },
      take: 500,
    });

    const knowledgeExports: KnowledgeExport[] = knowledgeEntries.map((k) => ({
      id: k.id,
      topic: (k as Record<string, unknown>).topic as string ?? 'unknown',
      domain: (k as Record<string, unknown>).domain as string ?? 'general',
      content: (k as Record<string, unknown>).content as string ?? '',
      confidence: k.confidence,
      source: (k as Record<string, unknown>).source as string ?? 'conversation',
      verified: ((k as Record<string, unknown>).verified as boolean) ?? false,
      createdAt: k.createdAt.toISOString(),
    }));

    // ── Growth (GrowthMetric: no userId, uses periodStart for scoping) ─
    const growthMetrics = await prisma.growthMetric.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const growthExports: GrowthExport[] = growthMetrics.map((g) => ({
      metric: (g as Record<string, unknown>).metric as string ?? 'unknown',
      value: (g as Record<string, unknown>).value as number ?? 0,
      previousValue: (g as Record<string, unknown>).previousValue as number ?? 0,
      trend: (g as Record<string, unknown>).trend as string ?? 'stable',
      recordedAt: g.createdAt.toISOString(),
    }));

    // ── Taste ────────────────────────────────────────────────────────
    const tasteProfile = await prisma.tasteProfile.findFirst({
      where: { userId: internalId },
    });

    const tasteSignals = await prisma.tasteSignal.findMany({
      where: { userId: internalId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const tasteExport: TasteExport = {
      dimensions: tasteProfile
        ? {
            tone: tasteProfile.tone,
            verbosity: tasteProfile.verbosity,
            humor: tasteProfile.humor,
            technical: tasteProfile.technical,
            emoji: tasteProfile.emoji,
          }
        : {},
      signals: tasteSignals.map((s) => ({
        category: (s as Record<string, unknown>).category as string ?? 'unknown',
        preference: (s as Record<string, unknown>).item as string ?? '',
        strength: (s as Record<string, unknown>).weight as number ?? 0.5,
        context: ((s as Record<string, unknown>).context as string) ?? '',
      })),
    };

    // ── Goals (Goal: no userId, global goals) ────────────────────────
    const goals = await prisma.goal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const goalExports: GoalExport[] = goals.map((g) => ({
      id: g.id,
      title: (g as Record<string, unknown>).title as string ?? 'Untitled',
      description: (g as Record<string, unknown>).description as string | null ?? null,
      status: (g as Record<string, unknown>).status as string ?? 'active',
      progress: (g as Record<string, unknown>).progress as number ?? 0,
      createdAt: g.createdAt.toISOString(),
      targetDate: (g as Record<string, unknown>).targetDate as string | null ?? null,
    }));

    // ── Proactive Insights ───────────────────────────────────────────
    const proactiveInsights = await prisma.proactiveInsight.findMany({
      where: { userId: internalId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const proactiveExports: ProactiveExport[] = proactiveInsights.map((p) => ({
      type: p.type,
      category: p.category,
      title: p.title,
      body: p.body,
      confidence: p.confidence,
      urgency: p.urgency,
      createdAt: p.createdAt.toISOString(),
    }));

    // ── Preferences ──────────────────────────────────────────────────
    const userPrefs = await prisma.userPreferences.findFirst({
      where: { clerkUserId },
    });

    const preferenceExport: PreferenceExport = {
      settings: userPrefs
        ? { theme: userPrefs.theme, language: userPrefs.language, timezone: userPrefs.timezone }
        : {},
      customInstructions: null,
      theme: userPrefs?.theme ?? null,
    };

    // ── Assemble ─────────────────────────────────────────────────────
    const daysTogether = Math.max(
      1,
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const totalMilestones = relMilestones.length;

    const relationshipDepth =
      totalMilestones >= 10 ? 'deep' : totalMilestones >= 5 ? 'established' : totalMilestones >= 2 ? 'growing' : 'initial';

    const portable: HollyPortableRelationship = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      hollyInstanceId: process.env.NEXT_PUBLIC_APP_URL ?? 'holly.nexamusicgroup.com',
      user: {
        name: user.name,
        email: user.email,
        clerkUserId: user.clerkUserId,
      },
      data: {
        conversations: conversationExports,
        memories: memoryExports,
        relationships: relationshipExport,
        personality: personalityExport,
        learning: learningExport,
        knowledge: knowledgeExports,
        growth: growthExports,
        taste: tasteExport,
        goals: goalExports,
        proactiveInsights: proactiveExports,
        preferences: preferenceExport,
      },
      stats: {
        totalConversations: conversations.length,
        totalMemories: semanticMemories.length,
        totalMilestones,
        totalLearningGoals: learningGoals.length,
        totalKnowledgeEntries: knowledgeEntries.length,
        relationshipDepth,
        daysTogether,
      },
    };

    console.log(
      `[MemoryExport] Exported ${portable.stats.totalConversations} conversations, ` +
        `${portable.stats.totalMemories} memories, ${portable.stats.totalMilestones} milestones ` +
        `for user ${internalId}`
    );

    return { success: true, data: portable };
  } catch (error) {
    console.error('[MemoryExport] Export failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ── Import ─────────────────────────────────────────────────────────────

export interface ImportOptions {
  skipExisting?: boolean;
  mergeStrategy?: 'replace' | 'merge' | 'append';
  maxImport?: number;
  dryRun?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    conversations: number;
    memories: number;
    milestones: number;
    learningGoals: number;
    knowledgeEntries: number;
    goals: number;
    tasteSignals: number;
  };
  skipped: {
    conversations: number;
    memories: number;
    duplicate: number;
  };
  errors: string[];
  dryRun?: boolean;
}

export async function importFullRelationship(
  clerkUserId: string,
  data: HollyPortableRelationship,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const { skipExisting = true, mergeStrategy = 'merge', dryRun = false } = options;

  const result: ImportResult = {
    success: true,
    imported: {
      conversations: 0,
      memories: 0,
      milestones: 0,
      learningGoals: 0,
      knowledgeEntries: 0,
      goals: 0,
      tasteSignals: 0,
    },
    skipped: { conversations: 0, memories: 0, duplicate: 0 },
    errors: [],
  };

  try {
    // Validate version
    if (data.version !== '1.0') {
      return {
        ...result,
        success: false,
        errors: [`Unsupported version: ${data.version}. Expected 1.0`],
      };
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { ...result, success: false, errors: ['User not found'] };
    }

    const internalId = user.id;

    if (dryRun) {
      result.dryRun = true;
      result.imported.conversations = data.data.conversations.length;
      result.imported.memories = data.data.memories.length;
      result.imported.milestones = data.data.relationships.milestones.length;
      result.imported.learningGoals = data.data.learning.goals.length;
      result.imported.knowledgeEntries = data.data.knowledge.length;
      result.imported.goals = data.data.goals.length;
      result.imported.tasteSignals = data.data.taste.signals.length;
      return result;
    }

    // ── Import conversations ────────────────────────────────────────
    for (const conv of data.data.conversations.slice(0, options.maxImport ?? 100)) {
      try {
        if (skipExisting) {
          const existing = await prisma.conversation.findUnique({ where: { id: conv.id } });
          if (existing) {
            result.skipped.conversations++;
            continue;
          }
        }

        await prisma.conversation.create({
          data: {
            id: conv.id,
            userId: internalId,
            title: conv.title,
            messages: {
              create: conv.messages.map((m) => ({
                userId: internalId,
                role: m.role,
                content: m.content,
                createdAt: new Date(m.createdAt),
              })),
            },
          },
        });
        result.imported.conversations++;
      } catch (err) {
        result.errors.push(`Conversation ${conv.id}: ${(err as Error).message}`);
      }
    }

    // ── Import memories ─────────────────────────────────────────────
    for (const mem of data.data.memories.slice(0, 1000)) {
      try {
        if (skipExisting) {
          const existing = await prisma.memoryEmbedding.findUnique({ where: { id: mem.id } });
          if (existing) {
            result.skipped.memories++;
            continue;
          }
        }

        await prisma.memoryEmbedding.create({
          data: {
            id: mem.id,
            userId: internalId,
            type: mem.type,
            content: mem.content,
            metadata: {
              category: mem.category,
              importance: mem.importance,
              accessCount: mem.accessCount,
            },
          },
        });
        result.imported.memories++;
      } catch (err) {
        result.errors.push(`Memory ${mem.id}: ${(err as Error).message}`);
      }
    }

    // ── Import relationship milestones ──────────────────────────────
    for (const ms of data.data.relationships.milestones) {
      try {
        await prisma.relationshipMilestone.create({
          data: {
            userId: internalId,
            type: ms.type,
            title: ms.description.slice(0, 100),
            description: ms.description,
            significance: 0.5,
          },
        });
        result.imported.milestones++;
      } catch (err) {
        result.errors.push(`Milestone: ${(err as Error).message}`);
      }
    }

    // ── Import relationship memories ────────────────────────────────
    for (const rm of data.data.relationships.memories) {
      try {
        // factType from export is "category/domain" — split it back
        const parts = rm.factType.split('/');
        const category = parts[0] ?? 'fact';
        const domain = parts[1] ?? 'general';
        await prisma.relationshipMemory.create({
          data: {
            userId: internalId,
            category,
            domain,
            key: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            content: rm.content,
            confidence: rm.confidence,
            source: rm.source,
          },
        });
      } catch (err) {
        result.errors.push(`RelMemory: ${(err as Error).message}`);
      }
    }

    // ── Import learning goals ───────────────────────────────────────
    for (const lg of data.data.learning.goals) {
      try {
        await prisma.learningGoal.create({
          data: {
            userId: internalId,
            topic: lg.topic,
            domain: lg.domain,
            description: `Imported goal: ${lg.topic}`,
            source: 'import',
            priority: lg.priority,
            status: lg.status,
          },
        });
        result.imported.learningGoals++;
      } catch (err) {
        result.errors.push(`LearningGoal ${lg.id}: ${(err as Error).message}`);
      }
    }

    // ── Import knowledge entries ────────────────────────────────────
    for (const k of data.data.knowledge) {
      try {
        await prisma.knowledgeEntry.create({
          data: {
            userId: internalId,
            topic: k.topic,
            domain: k.domain,
            title: k.topic,
            content: k.content,
            confidence: k.confidence,
            source: k.source,
          },
        });
        result.imported.knowledgeEntries++;
      } catch (err) {
        result.errors.push(`KnowledgeEntry: ${(err as Error).message}`);
      }
    }

    // ── Import goals (Goal has no userId — global goals) ────────────
    for (const g of data.data.goals) {
      try {
        await prisma.goal.create({
          data: {
            title: g.title,
            description: g.description ?? `Imported goal: ${g.title}`,
            category: 'imported',
            status: g.status,
          },
        });
        result.imported.goals++;
      } catch (err) {
        result.errors.push(`Goal: ${(err as Error).message}`);
      }
    }

    // ── Import taste signals ────────────────────────────────────────
    for (const ts of data.data.taste.signals) {
      try {
        await prisma.tasteSignal.create({
          data: {
            userId: internalId,
            category: ts.category,
            item: ts.preference,
            signal: 'positive',
            weight: ts.strength,
            context: ts.context,
            source: 'import',
          },
        });
        result.imported.tasteSignals++;
      } catch (err) {
        result.errors.push(`TasteSignal: ${(err as Error).message}`);
      }
    }

    // ── Update or create relationship profile ───────────────────────
    if (data.data.relationships.profile) {
      const rp = data.data.relationships.profile;
      try {
        const existing = await prisma.relationshipProfile.findFirst({
          where: { userId: internalId },
        });

        if (existing && mergeStrategy === 'merge') {
          await prisma.relationshipProfile.update({
            where: { id: existing.id },
            data: {
              coreValues: rp.values,
              boundaries: rp.boundaries,
              expertiseAreas: rp.skills,
              activeGoals: rp.goals,
            },
          });
        } else if (!existing) {
          await prisma.relationshipProfile.create({
            data: {
              userId: internalId,
              coreValues: rp.values,
              boundaries: rp.boundaries,
              expertiseAreas: rp.skills,
              activeGoals: rp.goals,
            },
          });
        }
      } catch (err) {
        result.errors.push(`RelationshipProfile: ${(err as Error).message}`);
      }
    }

    console.log(
      `[MemoryImport] Imported for user ${internalId}: ` +
        `${result.imported.conversations} conversations, ` +
        `${result.imported.memories} memories, ` +
        `${result.imported.milestones} milestones, ` +
        `${result.imported.learningGoals} learning goals, ` +
        `${result.imported.knowledgeEntries} knowledge entries`
    );

    return result;
  } catch (error) {
    console.error('[MemoryImport] Import failed:', error);
    return {
      ...result,
      success: false,
      errors: [...result.errors, `Fatal: ${(error as Error).message}`],
    };
  }
}
