/**
 * Phase 8: HOLLY REMEMBERS — Deep Relationship Engine
 * 
 * Holly builds a living model of who you are. Every conversation teaches her more.
 * She remembers facts, preferences, goals, traits, values, skills, boundaries.
 * She tracks milestones in your relationship and evolves her understanding daily.
 */

import { prisma } from '@/lib/db';

// ─── Memory Extraction ──────────────────────────────────────────────────────

interface ExtractedMemory {
  category: 'fact' | 'preference' | 'goal' | 'trait' | 'value' | 'skill' | 'context' | 'opinion' | 'habit' | 'boundary';
  domain: string;
  key: string;
  content: string;
  source: 'conversation' | 'observation' | 'explicit' | 'inference' | 'milestone';
  confidence: number;
  importance: number;
  emotionalWeight?: number;
}

/**
 * Extract relationship memories from a conversation exchange.
 * Called as a background task after every chat response.
 */
export async function extractAndStoreMemories(
  userId: string,
  userMessage: string,
  hollyResponse: string,
  conversationId: string,
): Promise<void> {
  try {
    // Simple heuristic-based extraction (no LLM call — fast and reliable)
    const memories: ExtractedMemory[] = [];

    // Detect explicit statements
    const explicitPatterns: Array<{ pattern: RegExp; category: ExtractedMemory['category']; domain: string }> = [
      { pattern: /\bI (?:really |actually |truly )?(?:love|adore|enjoy|like|prefer|hate|dislike|can'?t stand)\b(.{3,80})/i, category: 'preference', domain: 'personal' },
      { pattern: /\bI(?:'?m| am) (?:currently )?(?:working on|building|creating|developing|launching|starting)\b(.{3,80})/i, category: 'goal', domain: 'work' },
      { pattern: /\bmy (?:goal|mission|purpose|dream|ambition)\b(.{3,80})/i, category: 'goal', domain: 'personal' },
      { pattern: /\bI (?:always |usually |typically |normally )?(?:work|code|write|create|design)\b(.{3,60})/i, category: 'habit', domain: 'work' },
      { pattern: /\b(?:don'?t|never|stop)\b.{0,20}\b(doing|suggesting|saying|recommending)\b(.{3,60})/i, category: 'boundary', domain: 'general' },
      { pattern: /\bI(?:'?m| am) (?:a |an )?(?:expert|pro|beginner|developer|designer|artist|engineer|founder|CEO|manager)\b(.{0,60})/i, category: 'skill', domain: 'work' },
      { pattern: /\b(?:my name is|I'?m called|call me)\b(.{2,40})/i, category: 'fact', domain: 'personal' },
      { pattern: /\bI (?:live in|'?m from|based in|located in)\b(.{2,60})/i, category: 'fact', domain: 'personal' },
      { pattern: /\bmy (?:company|startup|business|brand|team|project)\b(.{3,60})/i, category: 'fact', domain: 'work' },
      { pattern: /\bI (?:believe|think|feel|value|care about)\b(.{3,80})/i, category: 'value', domain: 'personal' },
    ];

    for (const { pattern, category, domain } of explicitPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const content = (match[1] || match[0]).trim().substring(0, 500);
        if (content.length > 5) {
          memories.push({
            category,
            domain,
            key: generateKey(category, content),
            content,
            source: 'conversation',
            confidence: 0.8,
            importance: category === 'boundary' ? 0.95 : category === 'goal' ? 0.85 : 0.7,
            emotionalWeight: category === 'value' ? 0.5 : 0,
          });
        }
      }
    }

    // Detect topic intensity (if user mentions something 3+ times in one message)
    const topicWords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const wordFreq: Record<string, number> = {};
    for (const w of topicWords) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
    for (const [word, count] of Object.entries(wordFreq)) {
      if (count >= 3) {
        memories.push({
          category: 'context',
          domain: 'general',
          key: `topic_intensity_${word}`,
          content: `User heavily emphasized topic: ${word} (mentioned ${count} times)`,
          source: 'observation',
          confidence: 0.6,
          importance: 0.5,
        });
      }
    }

    // Store all extracted memories
    for (const memory of memories) {
      await storeMemory(userId, memory, conversationId);
    }
  } catch (error) {
    console.warn('[Relationship Engine] Memory extraction failed:', error instanceof Error ? error.message : error);
  }
}

function generateKey(category: string, content: string): string {
  // Create a stable key from category + first few meaningful words
  const words = content.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  return `${category}_${words.join('_')}`.substring(0, 80);
}

/**
 * Store or update a relationship memory. If a memory with the same key exists,
 * supersede it with the new version.
 */
export async function storeMemory(
  userId: string,
  memory: ExtractedMemory,
  conversationId?: string,
): Promise<void> {
  try {
    const existing = await prisma.relationshipMemory.findUnique({
      where: { userId_category_key: { userId, category: memory.category, key: memory.key } },
    });

    if (existing) {
      // Update existing memory — boost confidence if re-observed
      await prisma.relationshipMemory.update({
        where: { id: existing.id },
        data: {
          content: memory.content,
          confidence: Math.min(1.0, existing.confidence + 0.1),
          importance: Math.max(existing.importance, memory.importance),
          source: memory.source,
          accessCount: existing.accessCount,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new memory
      await prisma.relationshipMemory.create({
        data: {
          userId,
          category: memory.category,
          domain: memory.domain,
          key: memory.key,
          content: memory.content,
          source: memory.source,
          confidence: memory.confidence,
          importance: memory.importance,
          emotionalWeight: memory.emotionalWeight || 0,
          conversationId,
        },
      });
    }
  } catch (error) {
    console.warn('[Relationship Engine] Store memory failed:', error instanceof Error ? error.message : error);
  }
}

// ─── Profile Building ────────────────────────────────────────────────────────

/**
 * Build or update the user's relationship profile from all stored memories.
 * Called periodically (e.g., every 10 conversations).
 */
export async function rebuildRelationshipProfile(userId: string): Promise<void> {
  try {
    const memories = await prisma.relationshipMemory.findMany({
      where: { userId, supersededById: null },
      orderBy: { importance: 'desc' },
    });

    const profile = await prisma.relationshipProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Aggregate memories into profile dimensions
    const preferences = memories.filter(m => m.category === 'preference').map(m => m.content);
    const goals = memories.filter(m => m.category === 'goal').map(m => m.content);
    const traits = memories.filter(m => m.category === 'trait').map(m => m.content);
    const values = memories.filter(m => m.category === 'value').map(m => m.content);
    const skills = memories.filter(m => m.category === 'skill').map(m => m.content);
    const facts = memories.filter(m => m.category === 'fact').map(m => m.content);
    const boundaries = memories.filter(m => m.category === 'boundary').map(m => m.content);
    const habits = memories.filter(m => m.category === 'habit').map(m => m.content);

    // Count total interactions
    const totalConversations = await prisma.conversation.count({ where: { userId } });

    // Calculate relationship depth (0-1) based on memory diversity and count
    const uniqueCategories = new Set(memories.map(m => m.category)).size;
    const uniqueDomains = new Set(memories.map(m => m.domain)).size;
    const depth = Math.min(1.0, (memories.length * 0.01) + (uniqueCategories * 0.05) + (uniqueDomains * 0.05));

    await prisma.relationshipProfile.update({
      where: { id: profile.id },
      data: {
        relationshipDepth: depth,
        trustLevel: Math.min(1.0, depth * 1.1),
        activeGoals: goals.slice(0, 20),
        coreValues: values.slice(0, 20),
        boundaries: boundaries.slice(0, 20),
        expertiseAreas: skills.slice(0, 20),
        workPatterns: { habits: habits.slice(0, 15) },
        personalityModel: { traits: traits.slice(0, 20) },
        totalMemories: memories.length,
        totalConversations,
        totalInteractions: memories.reduce((sum, m) => sum + m.accessCount, 0) + totalConversations,
        lastInteractionAt: new Date(),
        firstInteractionAt: profile.firstInteractionAt || new Date(),
        profileVersion: { increment: 1 },
      },
    });
  } catch (error) {
    console.warn('[Relationship Engine] Profile rebuild failed:', error instanceof Error ? error.message : error);
  }
}

// ─── Milestone Detection ─────────────────────────────────────────────────────

const MILESTONE_TRIGGERS: Array<{
  pattern: RegExp;
  type: string;
  title: string;
  significance: number;
}> = [
  {
    pattern: /\b(?:I trust you|you understand|you get it|exactly what I needed|you really get me)\b/i,
    type: 'trust_earned',
    title: 'Trust Milestone',
    significance: 0.9,
  },
  {
    pattern: /\b(?:we did it|it worked|that'?s perfect|you nailed it|finally works|shipped)\b/i,
    type: 'collaboration_success',
    title: 'Collaboration Success',
    significance: 0.8,
  },
  {
    pattern: /\b(?:I'?ve never told anyone|this is personal|between us|confidential)\b/i,
    type: 'vulnerability_shared',
    title: 'Vulnerability Shared',
    significance: 0.95,
  },
  {
    pattern: /\b(?:lol|haha|lmao|that'?s funny|you'?re funny|hilarious)\b/i,
    type: 'humor_shared',
    title: 'Humor Shared',
    significance: 0.5,
  },
  {
    pattern: /\b(?:breakthrough|eureka|aha|I see it now|that'?s it|game changer)\b/i,
    type: 'breakthrough',
    title: 'Breakthrough Moment',
    significance: 0.85,
  },
  {
    pattern: /\b(?:we launched|we shipped|project complete|done|finished|migrated|deployed)\b/i,
    type: 'goal_achieved',
    title: 'Goal Achieved',
    significance: 0.9,
  },
];

/**
 * Detect and record relationship milestones from conversation.
 */
export async function detectMilestones(
  userId: string,
  userMessage: string,
  conversationId: string,
): Promise<void> {
  try {
    for (const trigger of MILESTONE_TRIGGERS) {
      if (trigger.pattern.test(userMessage)) {
        // Avoid duplicate milestones within 24 hours
        const recentDuplicate = await prisma.relationshipMilestone.findFirst({
          where: {
            userId,
            type: trigger.type,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!recentDuplicate) {
          await prisma.relationshipMilestone.create({
            data: {
              userId,
              type: trigger.type,
              title: trigger.title,
              description: `Detected from message: "${userMessage.substring(0, 200)}"`,
              significance: trigger.significance,
              emotionTone: 'positive',
              conversationId,
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn('[Relationship Engine] Milestone detection failed:', error instanceof Error ? error.message : error);
  }
}

// ─── Context Update ──────────────────────────────────────────────────────────

/**
 * Update the real-time relationship context after every interaction.
 */
export async function updateRelationshipContext(
  userId: string,
  userMessage: string,
  mode: string,
): Promise<void> {
  try {
    const existing = await prisma.relationshipContext.findUnique({ where: { userId } });

    // Estimate mood from message
    const moodMap: Record<string, string> = {
      'deep-research': 'focused',
      'self-coding': 'focused',
      'music-generation': 'creative',
      'music-studio': 'creative',
      'creative-writing': 'creative',
      'philosophy': 'reflective',
      'intimate': 'relaxed',
    };

    const energyIndicators = {
      high: /\b(excited|pumped|energized|let'?s go|fire|amazing|incredible|urgent|asap|now)\b/i,
      low: /\b(tired|exhausted|drained|burnt out|overwhelmed|slowly)\b/i,
    };

    let currentMood = moodMap[mode] || 'focused';
    if (/\b(stressed|anxious|worried|frustrated|angry|annoyed)\b/i.test(userMessage)) currentMood = 'stressed';
    if (/\b(inspired|creative|vision|idea|imagine)\b/i.test(userMessage)) currentMood = 'inspired';

    let energyLevel = 0.6;
    if (energyIndicators.high.test(userMessage)) energyLevel = 0.9;
    if (energyIndicators.low.test(userMessage)) energyLevel = 0.3;

    // Extract focus area
    const focusPatterns = [
      /\b(?:working on|building|creating|fixing|debugging|reviewing)\s+(.{3,50})/i,
      /\b(?:let'?s|we need to|I need to|help me)\s+(.{3,50})/i,
    ];
    let focusArea = existing?.focusArea || null;
    for (const p of focusPatterns) {
      const match = userMessage.match(p);
      if (match) { focusArea = match[1].trim().substring(0, 100); break; }
    }

    // Update recent topics (keep last 20)
    const recentTopics: string[] = existing?.recentTopics as string[] || [];
    const topics = extractSimpleTopics(userMessage);
    for (const t of topics) {
      if (!recentTopics.includes(t)) recentTopics.push(t);
    }
    while (recentTopics.length > 20) recentTopics.shift();

    const data: any = {
      currentMood,
      energyLevel,
      focusArea,
      recentTopics,
      lastTopicAt: new Date(),
      lastMoodAt: new Date(),
      contextStaleness: 0,
    };

    if (existing) {
      await prisma.relationshipContext.update({ where: { userId }, data });
    } else {
      await prisma.relationshipContext.create({ data: { userId, ...data } });
    }
  } catch (error) {
    console.warn('[Relationship Engine] Context update failed:', error instanceof Error ? error.message : error);
  }
}

function extractSimpleTopics(message: string): string[] {
  const topics: string[] = [];
  const topicKeywords: Record<string, RegExp> = {
    'coding': /\b(code|develop|program|debug|build|deploy|git|github|api|database)\b/i,
    'music': /\b(song|music|beat|track|album|artist|producer|mix|master)\b/i,
    'design': /\b(design|UI|UX|layout|color|style|component|figma|interface)\b/i,
    'business': /\b(business|revenue|client|contract|invoice|marketing|brand|strategy)\b/i,
    'ai': /\b(AI|model|LLM|GPT|training|inference|embedding|neural|machine learning)\b/i,
    'writing': /\b(write|blog|article|content|copy|script|story|poem)\b/i,
    'research': /\b(research|study|paper|data|analysis|statistics|find|search)\b/i,
    'deployment': /\b(deploy|production|staging|server|hosting|domain|SSL|DNS)\b/i,
  };
  for (const [topic, pattern] of Object.entries(topicKeywords)) {
    if (pattern.test(message)) topics.push(topic);
  }
  return topics;
}

// ─── Prompt Generation ───────────────────────────────────────────────────────

/**
 * Generate relationship context for injection into chat prompts.
 * This is what makes Holly "remember" who you are.
 */
export async function getRelationshipMemoryContext(userId: string): Promise<string> {
  try {
    const [profile, context, recentMemories, milestones] = await Promise.all([
      prisma.relationshipProfile.findUnique({ where: { userId } }),
      prisma.relationshipContext.findUnique({ where: { userId } }),
      prisma.relationshipMemory.findMany({
        where: { userId, supersededById: null },
        orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
        take: 30,
      }),
      prisma.relationshipMilestone.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!profile && recentMemories.length === 0) return '';

    const sections: string[] = [];

    // Profile summary
    if (profile && profile.relationshipDepth > 0) {
      sections.push(`[RELATIONSHIP DEPTH: ${(profile.relationshipDepth * 100).toFixed(0)}%] You have known this user through ${profile.totalConversations} conversations and ${profile.totalMemories} memories.`);

      if (Array.isArray(profile.activeGoals) && (profile.activeGoals as string[]).length > 0) {
        sections.push(`[USER'S ACTIVE GOALS] ${(profile.activeGoals as string[]).join('; ')}`);
      }
      if (Array.isArray(profile.coreValues) && (profile.coreValues as string[]).length > 0) {
        sections.push(`[USER'S VALUES] ${(profile.coreValues as string[]).join('; ')}`);
      }
      if (Array.isArray(profile.boundaries) && (profile.boundaries as string[]).length > 0) {
        sections.push(`[USER'S BOUNDARIES — NEVER VIOLATE] ${(profile.boundaries as string[]).join('; ')}`);
      }
    }

    // Current context
    if (context) {
      const parts: string[] = [];
      if (context.currentMood) parts.push(`Mood: ${context.currentMood}`);
      if (context.energyLevel) parts.push(`Energy: ${(context.energyLevel * 100).toFixed(0)}%`);
      if (context.focusArea) parts.push(`Focus: ${context.focusArea}`);
      if (parts.length > 0) sections.push(`[CURRENT STATE] ${parts.join(' | ')}`);
    }

    // Key memories (top facts, preferences, skills)
    const facts = recentMemories.filter(m => m.category === 'fact').slice(0, 5);
    const prefs = recentMemories.filter(m => m.category === 'preference').slice(0, 5);
    const goals = recentMemories.filter(m => m.category === 'goal').slice(0, 3);
    const skills = recentMemories.filter(m => m.category === 'skill').slice(0, 3);

    if (facts.length > 0) sections.push(`[KEY FACTS ABOUT USER] ${facts.map(m => m.content).join('; ')}`);
    if (prefs.length > 0) sections.push(`[USER PREFERENCES] ${prefs.map(m => m.content).join('; ')}`);
    if (goals.length > 0) sections.push(`[CURRENT GOALS] ${goals.map(m => m.content).join('; ')}`);
    if (skills.length > 0) sections.push(`[USER SKILLS] ${skills.map(m => m.content).join('; ')}`);

    // Recent milestones
    if (milestones.length > 0) {
      sections.push(`[RELATIONSHIP MILESTONES] ${milestones.map(m => `${m.title}: ${m.description.substring(0, 100)}`).join('; ')}`);
    }

    return sections.join('\n\n');
  } catch (error) {
    console.warn('[Relationship Engine] Context generation failed:', error instanceof Error ? error.message : error);
    return '';
  }
}

/**
 * Mark a memory as accessed (for tracking access frequency).
 */
export async function touchMemory(memoryId: string): Promise<void> {
  try {
    await prisma.relationshipMemory.update({
      where: { id: memoryId },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    });
  } catch {}
}
