import { prisma } from '@/lib/db';
import { extractMemories } from '@/lib/memory-service';
import { recordExchange, extractTopics } from '@/lib/consciousness/post-response-hook';
import { rememberExchange } from '@/lib/memory/semantic-memory';
import { detectRelevantProject, addNote } from '@/lib/project-context/holly-projects';
import { collectFromConversation } from '@/lib/self-sovereign/training-pipeline';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { persistEmotionalBaseline } from '@/lib/consciousness/emotional-continuity';
import { detectEmotionsLLM } from '@/lib/emotion/ml-emotion-detector';
import { extractAndStoreMemories, detectMilestones, updateRelationshipContext, rebuildRelationshipProfile } from '@/lib/relationship/relationship-engine';
import { detectAndTrackPatterns, generateProactiveInsights } from '@/lib/proactive/proactive-engine';
import { detectKnowledgeGaps, createLearningGoalsFromGaps, extractKnowledgeFromConversation } from '@/lib/learning/autonomous-learning';
import { learnCommunicationStyle } from '@/lib/personality/adaptive-personality';
import { assessConversation } from '@/lib/growth/sovereign-growth';
import { assessResponseQuality, storeQualityScores } from '@/lib/emotional/response-quality';

let _lastResponseStart = 0;
export function markResponseStart(): void { _lastResponseStart = Date.now(); }

export async function saveMessages(
  dbUserId: string,
  conversationId: string,
  latestUserMessage: string,
  fullResponse: string,
): Promise<void> {
  try {
    // Performance: run upsert and both message creates in parallel
    // The upsert ensures the conversation exists; message creates are independent
    await Promise.all([
      prisma.conversation.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          userId: dbUserId,
          title: null,
          messageCount: 2,
          lastMessagePreview: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
        },
        update: {
          messageCount: { increment: 2 },
          lastMessagePreview: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
          updatedAt: new Date(),
        },
      }),
      prisma.message.create({ data: { conversationId, role: 'user', content: latestUserMessage, userId: dbUserId } }),
      prisma.message.create({ data: { conversationId, role: 'assistant', content: fullResponse, userId: dbUserId } }),
    ]);
  } catch (dbErr) {
    console.error('[Chat API] ⚠️ DB save failed:', dbErr);
  }
}

export async function runBackgroundTasks(opts: {
  dbUserId: string;
  conversationId: string;
  latestUserMessage: string;
  fullResponse: string;
  detectedMode: string;
  currentTopics: string[];
  activeModel: string;
  messages: any[];
  perceptionContext?: any[];
  audioAnalysis?: any;
}): Promise<void> {
  const { dbUserId, conversationId, latestUserMessage, fullResponse, detectedMode, currentTopics, activeModel, messages, perceptionContext, audioAnalysis } = opts;

  const bgLog = (label: string, err: unknown) => {
    console.error(`[Chat API] ❌ Background task "${label}" failed:`, err instanceof Error ? err.message : err);
  };

  // Memory extraction
  extractMemories(conversationId, [
    ...messages.slice(1).filter((m: any) => m.role !== 'tool').map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : m.content.map((b: any) => b.type === 'text' ? (b.text ?? '') : '[image]').join(' '),
    })),
    { role: 'assistant', content: fullResponse },
  ]).catch(err => bgLog('memory-extraction', err));

  // Auto-generate title for new conversations
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { title: true, messageCount: true },
  });

  if (conversation && !conversation.title && conversation.messageCount <= 2) {
    const titlePrompt = `Generate a concise, descriptive title (3-6 words) for a conversation that starts with:\n\n"${latestUserMessage}"\n\nReturn ONLY the title, nothing else.`;
    (async () => {
      try {
        const routing = await smartRoute(titlePrompt, { taskHint: 'speed' });
        const { text: raw } = await cascadeCollect(
          routing.waterfall,
          [{ role: 'user', content: titlePrompt }],
          { temperature: 0.3, maxTokens: 40 },
        );
        let generatedTitle = (raw || '').trim().replace(/^["']|["']$/g, '').replace(/^Title:\s*/i, '').trim();
        if (generatedTitle && generatedTitle.length <= 60) {
          await prisma.conversation.update({ where: { id: conversationId }, data: { title: generatedTitle } });
        }
      } catch (err) {
        bgLog('title-generation', err);
      }
    })();
  }

  // Record exchange for identity/emotion/taste evolution
  void recordExchange({
    userId: dbUserId,
    conversationId,
    userMessage: latestUserMessage,
    assistantResponse: fullResponse,
    detectedMode,
    topics: currentTopics,
  });

  // Semantic memory
  rememberExchange(dbUserId, latestUserMessage, fullResponse).catch(err => bgLog('semantic-memory', err));

  // Auto-note on relevant project
  detectRelevantProject(dbUserId, latestUserMessage)
    .then(project => {
      if (project) {
        addNote(dbUserId, project.id, `[Auto] ${fullResponse.substring(0, 200)}`, 'holly', currentTopics)
          .catch(err => bgLog('project-auto-note', err));
      }
    }).catch(err => bgLog('project-detection', err));

  // Training pipeline
  collectFromConversation(latestUserMessage, fullResponse, 0.7, {
    mode: detectedMode,
    topics: currentTopics,
    model: activeModel,
    hasPerception: !!perceptionContext?.length,
    hasAudio: !!audioAnalysis,
  }).catch(err => bgLog('training-pipeline', err));

  // Phase 12: Adaptive Personality — learn communication style
  learnCommunicationStyle(dbUserId, latestUserMessage, fullResponse).catch(err => bgLog('style-learning', err));

  // Phase 11: Autonomous Learning — extract knowledge, detect gaps
  extractKnowledgeFromConversation(dbUserId, latestUserMessage, fullResponse).catch(err => bgLog('knowledge-extraction', err));
  (async () => {
    try {
      const gaps = await detectKnowledgeGaps(dbUserId, currentTopics);
      if (gaps.length > 0) {
        const patterns = await prisma.patternTracker.findMany({ where: { userId: dbUserId, significance: { in: ['high', 'medium'] } }, take: 10 });
        const created = await createLearningGoalsFromGaps(dbUserId, gaps, patterns.map(p => ({ patternName: p.patternName, frequency: p.frequency, occurrences: p.occurrences })));
        if (created > 0) {
          console.log(`[StudyScheduler] Queued ${created} new learning goals for next study cycle: ${gaps.join(', ')}`);
        }
      }
    } catch (err) { bgLog('gap-detection', err); }
  })();

  // Phase 10: Proactive Intelligence — pattern tracking, insight generation
  detectAndTrackPatterns({
    userId: dbUserId,
    topics: currentTopics,
    mode: detectedMode,
    messageLength: latestUserMessage.length,
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
  }).catch(err => bgLog('pattern-tracking', err));
  (async () => {
    try {
      const created = await generateProactiveInsights(dbUserId);
      if (created > 0) {
        // Phase 15: Push new insights to user in real-time if online
        const { notificationDispatcher } = await import('@/lib/notifications/notification-dispatcher');
        notificationDispatcher.dispatchPendingInsights(dbUserId).catch(err => bgLog('insight-push', err));
      }
    } catch (err) { bgLog('insight-generation', err); }
  })();

  // Phase 8: Deep Relationship Engine — extract memories, detect milestones, update context
  extractAndStoreMemories(dbUserId, latestUserMessage, fullResponse, conversationId).catch(err => bgLog('relationship-memories', err));
  detectMilestones(dbUserId, latestUserMessage, conversationId).catch(err => bgLog('relationship-milestones', err));
  updateRelationshipContext(dbUserId, latestUserMessage, detectedMode).catch(err => bgLog('relationship-context', err));

  // Rebuild profile every ~10 conversations (check message count)
  (async () => {
    try {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { messageCount: true } });
      if (conv && conv.messageCount % 20 === 0) {
        await rebuildRelationshipProfile(dbUserId);
        // Phase 17: Invalidate cached context after profile rebuild
        const { invalidateUserCache } = await import('@/lib/multi-tenant/user-context-cache');
        invalidateUserCache(dbUserId);
      }
    } catch {}
  })();

  // Phase 13: Sovereign Growth — self-assess this conversation
  assessConversation({
    userId: dbUserId,
    conversationId,
    messageCount: messages.length,
    mode: detectedMode,
    topics: currentTopics,
    responseTimeMs: _lastResponseStart > 0 ? Date.now() - _lastResponseStart : 0,
    hadFeedback: false,
  }).catch(err => bgLog('self-assessment', err));

  // Phase E4: Response Quality Assessment — measures empathy, warmth, relevance, tone match
  (async () => {
    try {
      const scores = await assessResponseQuality(latestUserMessage, fullResponse);
      await storeQualityScores(dbUserId, scores, conversationId);
      console.log(`[ResponseQuality] Scores: empathy=${scores.empathy} warmth=${scores.warmth} relevance=${scores.relevance} tone=${scores.toneMatch} overall=${scores.overall}`);
    } catch (err) {
      bgLog('response-quality', err);
    }
  })();

  // Emotional state persistence (Phase 4.1) + Visual Identity Evolution (Phase 25)
  // Performance: share one detectEmotionsLLM call between both tasks (was called twice)
  const emotionPromise = detectEmotionsLLM(latestUserMessage).catch(err => {
    bgLog('emotion-detection', err);
    return null;
  });

  // Emotional state persistence
  (async () => {
    try {
      const emotionResult = await emotionPromise;
      if (!emotionResult) return;

      const emotionalArc = emotionResult.valence > 0.3 ? 'improving' :
                          emotionResult.valence < -0.3 ? 'declining' : 'stable';

      await persistEmotionalBaseline(dbUserId, {
        primaryMood: emotionResult.primary,
        valence: emotionResult.valence,
        arousal: emotionResult.arousal,
        intensity: emotionResult.confidence,
        topic: currentTopics.slice(0, 3).join(', ') || 'general',
        emotionalArc,
      });

      console.log(`[EmotionalContinuity] Saved emotional state: ${emotionResult.primary} (valence: ${emotionResult.valence.toFixed(2)})`);
    } catch (err) {
      bgLog('emotional-persistence', err);
    }
  })();

  // Visual Identity Evolution (Phase 25) — reuses shared emotion result
  (async () => {
    try {
      const { evolveVisualIdentity } = await import('@/lib/visual/visual-identity-engine');

      // Parallel: load relationship profile + shared emotion detection
      const [relProfile, emotionResult] = await Promise.all([
        prisma.relationshipProfile.findUnique({
          where: { userId: dbUserId },
          select: { trustScore: true, depth: true, communicationStyle: true },
        }).catch(() => null),
        emotionPromise,
      ]);

      await evolveVisualIdentity(dbUserId, {
        dominantEmotion: emotionResult?.primary,
        energyLevel: emotionResult?.arousal,
        warmthLevel: emotionResult?.valence !== undefined ? (emotionResult.valence + 1) / 2 : undefined,
        relationshipDepth: relProfile?.depth ? relProfile.depth / 10 : undefined,
        trustScore: relProfile?.trustScore ?? undefined,
      });
    } catch (err) {
      bgLog('visual-identity-evolution', err);
    }
  })();
}
