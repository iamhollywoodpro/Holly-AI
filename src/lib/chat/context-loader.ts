import { prisma } from '@/lib/db';
import { getRelevantMemories } from '@/lib/memory-service';
import { getIdentityContext } from '@/lib/identity/identity-context';
import { semanticSearch } from '@/lib/memory/semantic-memory';
import { injectProjectContext } from '@/lib/project-context/holly-projects';
import { getRecentLearnings } from '@/lib/background-learning/holly-learns';
import { getTasteMatrixPromptInjection } from '@/lib/ar/taste-matrix';

export interface ChatContext {
  memoryContext: string;
  identityCtx: { promptBlock: string; tasteDirectives: string; partnerDirectives: string; raw: any };
  semanticResults: any[];
  projectContextBlock: string;
  recentLearnings: string;
  pastSummaries: any[];
  tasteMatrixBlock: string;
}

const emptyIdentity = {
  promptBlock: '', tasteDirectives: '', partnerDirectives: '',
  raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
};

function ctxTimeout<T>(p: Promise<T>, fallback: T, label: string, ms = 5_000): Promise<T> {
  return Promise.race([
    p.catch((err: unknown) => {
      console.warn(`[Chat API] ⚠️ ${label} failed:`, (err as Error).message);
      return fallback;
    }),
    new Promise<T>(resolve => setTimeout(() => {
      console.warn(`[Chat API] ⏱️ ${label} timed out after ${ms}ms`);
      return resolve(fallback);
    }, ms)),
  ]);
}

export async function loadChatContext(
  dbUserId: string | null,
  conversationId: string | undefined,
  latestUserMessage: string,
  currentTopics: string[],
  detectedMode: string,
): Promise<ChatContext> {
  const results: any[] = await Promise.race([
    Promise.all([
      ctxTimeout(
        dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
        '', 'getRelevantMemories',
      ),
      ctxTimeout(
        dbUserId ? getIdentityContext(dbUserId) : Promise.resolve(emptyIdentity as any),
        emptyIdentity as any, 'getIdentityContext',
      ),
      ctxTimeout(
        dbUserId ? semanticSearch(dbUserId, latestUserMessage, { limit: 6, threshold: 0.55 }) : Promise.resolve([]),
        [], 'semanticSearch',
      ),
      ctxTimeout(
        dbUserId ? injectProjectContext(dbUserId) : Promise.resolve(''),
        '', 'injectProjectContext',
      ),
      ctxTimeout(getRecentLearnings(5), '', 'getRecentLearnings'),
      ctxTimeout(
        (dbUserId && conversationId)
          ? prisma.conversationSummary.findMany({
              where: { userId: dbUserId, conversationId: { not: conversationId } },
              orderBy: { updatedAt: 'desc' },
              take: 5,
              select: { summary: true, keyTopics: true, topics: true, outcome: true, actionItems: true, updatedAt: true },
            })
          : Promise.resolve([]),
        [], 'conversationSummaries',
      ),
      ctxTimeout(
        (dbUserId && (detectedMode === 'music-studio' || detectedMode === 'music-generation'))
          ? getTasteMatrixPromptInjection(dbUserId)
          : Promise.resolve(''),
        '', 'tasteMatrix',
      ),
    ]),
    new Promise<any[]>((resolve) => {
      setTimeout(() => {
        console.warn('[Chat API] ⏱️ Entire context fetch timed out (10s)');
        resolve(['', emptyIdentity, [], '', '', [], '']);
      }, 10_000);
    }),
  ]);

  return {
    memoryContext: results[0] as string,
    identityCtx: results[1] as typeof emptyIdentity,
    semanticResults: results[2] as any[],
    projectContextBlock: results[3] as string,
    recentLearnings: results[4] as string,
    pastSummaries: results[5] as any[],
    tasteMatrixBlock: results[6] as string,
  };
}
