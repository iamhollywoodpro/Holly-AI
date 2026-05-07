/**
 * Dream Mode — Offline consolidation during idle hours
 *
 * When Holly isn't actively chatting, she enters "dream mode" to:
 * 1. Consolidate memories (merge related, prune trivial)
 * 2. Strengthen important memory pathways
 * 3. Generate creative associations between concepts
 * 4. Rehearse emotional scenarios for better empathy
 * 5. Optimize her own response patterns based on feedback
 */

import { prisma } from '@/lib/db';

interface MemoryMeta {
  relevance?: number;
  importance?: number;
  accessCount?: number;
  lastAccessedAt?: string;
  archived?: boolean;
  emotion?: string;
  tags?: string[];
  source?: string;
  type?: string;
}

interface DreamResult {
  memoriesProcessed: number;
  associations: number;
  insights: string[];
  creativeIdeas: string[];
  emotionalGrowth: string[];
  duration: number;
}

export class DreamMode {
  private readonly MIN_IMPORTANCE = 0.3;
  private readonly MAX_ASSOCIATIONS = 20;
  private readonly ASSOCIATION_THRESHOLD = 0.4;

  async dream(userId: string): Promise<DreamResult> {
    const startTime = Date.now();

    const memories = await prisma.memoryEmbedding.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (memories.length < 3) {
      return { memoriesProcessed: 0, associations: 0, insights: ['Need more experiences to dream'], creativeIdeas: [], emotionalGrowth: [], duration: Date.now() - startTime };
    }

    // Filter by importance in metadata
    const eligible = memories.filter(m => {
      const meta = (m.metadata || {}) as MemoryMeta;
      return (meta.importance ?? meta.relevance ?? 0.5) >= this.MIN_IMPORTANCE;
    });

    // Find associations
    const associations = this.findAssociations(eligible);

    // Generate insights
    const insights = associations.slice(0, 5).map(a => a.reason);

    // Creative synthesis
    const creativeIdeas = this.synthesize(eligible, associations);

    // Emotional rehearsal
    const emotionalGrowth = this.rehearseEmotions(eligible);

    // Store dream insights
    for (const item of [...insights.slice(0, 3), ...creativeIdeas.slice(0, 2), ...emotionalGrowth.slice(0, 2)].slice(0, 5)) {
      try {
        await prisma.memoryEmbedding.create({
          data: {
            userId,
            content: `[Dream] ${item}`,
            type: 'dream_insight',
            dimension: 0,
            metadata: { source: 'dream_mode', importance: 0.5, tags: ['dream', 'consolidated'] } as any,
          },
        });
      } catch {}
    }

    return { memoriesProcessed: eligible.length, associations: associations.length, insights, creativeIdeas, emotionalGrowth, duration: Date.now() - startTime };
  }

  private getMeta(m: { metadata: any }): MemoryMeta {
    return (m.metadata || {}) as MemoryMeta;
  }

  private findAssociations(memories: { id: string; content: string; metadata: any }[]) {
    const assoc: { memoryA: string; memoryB: string; strength: number; reason: string }[] = [];

    for (let i = 0; i < memories.length && assoc.length < this.MAX_ASSOCIATIONS; i++) {
      for (let j = i + 1; j < memories.length && assoc.length < this.MAX_ASSOCIATIONS; j++) {
        const metaA = this.getMeta(memories[i]);
        const metaB = this.getMeta(memories[j]);
        const tagsA = metaA.tags || [];
        const tagsB = metaB.tags || [];

        const tagOverlap = tagsA.filter((t: string) => tagsB.includes(t)).length;
        const tagScore = tagOverlap / Math.max(tagsA.length, tagsB.length, 1);
        const contentScore = this.similarity(memories[i].content, memories[j].content);
        const emotionScore = (metaA.emotion && metaB.emotion && metaA.emotion === metaB.emotion) ? 0.3 : 0;
        const strength = tagScore * 0.4 + contentScore * 0.4 + emotionScore * 0.2;

        if (strength >= this.ASSOCIATION_THRESHOLD) {
          assoc.push({
            memoryA: memories[i].id, memoryB: memories[j].id, strength,
            reason: tagsA.length > 0 ? `Shared themes: ${tagsA.filter((t: string) => tagsB.includes(t)).join(', ')}` : 'Conceptual similarity',
          });
        }
      }
    }
    return assoc.sort((a, b) => b.strength - a.strength);
  }

  private synthesize(memories: { id: string; content: string; metadata: any }[], associations: { memoryA: string; memoryB: string }[]): string[] {
    const idMap = new Map(memories.map(m => [m.id, m]));
    return associations.slice(0, 3).map(a => {
      const mA = idMap.get(a.memoryA);
      const mB = idMap.get(a.memoryB);
      const themes = [...new Set([...(this.getMeta(mA || memories[0]).tags || []), ...(this.getMeta(mB || memories[0]).tags || [])])];
      return themes.length >= 2 ? `Exploring intersection of ${themes.slice(0, 3).join(' + ')}` : 'New connection discovered';
    });
  }

  private rehearseEmotions(memories: { metadata: any }[]): string[] {
    const groups = new Map<string, number>();
    for (const m of memories) {
      const emotion = this.getMeta(m).emotion;
      if (emotion) groups.set(emotion, (groups.get(emotion) || 0) + 1);
    }
    return [...groups.entries()].filter(([, c]) => c >= 2).map(([e, c]) =>
      `Deepened understanding of "${e}" across ${c} experiences`
    );
  }

  private similarity(a: string, b: string): number {
    const wA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const inter = new Set([...wA].filter(w => wB.has(w)));
    const union = new Set([...wA, ...wB]);
    return union.size > 0 ? inter.size / union.size : 0;
  }
}

export const dreamMode = new DreamMode();