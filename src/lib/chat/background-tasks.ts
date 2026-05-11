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

export async function saveMessages(
  dbUserId: string,
  conversationId: string,
  latestUserMessage: string,
  fullResponse: string,
): Promise<void> {
  try {
    await prisma.conversation.upsert({
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
    });
    await prisma.message.create({ data: { conversationId, role: 'user', content: latestUserMessage, userId: dbUserId } });
    await prisma.message.create({ data: { conversationId, role: 'assistant', content: fullResponse, userId: dbUserId } });
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

  // Emotional state persistence (Phase 4.1)
  // Detect user's emotion from their message and save as baseline
  (async () => {
    try {
      const emotionResult = await detectEmotionsLLM(latestUserMessage);
      
      // Determine emotional arc (simple heuristic based on valence trend)
      // In a real implementation, you'd compare with previous sessions
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
}
