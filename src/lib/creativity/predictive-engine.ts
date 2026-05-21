// HOLLY Predictive Engine
// Predicts concepts based on REAL historical patterns and taste signals

import { prisma } from '@/lib/db';

export interface PredictiveConcept {
  type: 'design' | 'code' | 'music' | 'art';
  suggestion: string;
  confidence: number;
  reasoning: string;
}

/**
 * PredictiveEngine — powered by REAL TasteProfile and TasteSignal data
 */
export class PredictiveEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate draft concepts based on user's taste profile and past signals
   */
  async generateDraftConcepts(): Promise<PredictiveConcept[]> {
    const [profile, recentSignals] = await Promise.all([
      prisma.tasteProfile.findUnique({ where: { userId: this.userId } }),
      prisma.tasteSignal.findMany({
        where: { userId: this.userId, signal: 'positive' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!profile && recentSignals.length === 0) {
      return [];
    }

    const concepts: PredictiveConcept[] = [];

    // Analyze tone preference
    const tone = profile?.tone ?? 0.5;
    if (tone > 0.6) {
      concepts.push({
        type: 'design',
        suggestion: 'Casual, friendly visual design with rounded corners and warm colors',
        confidence: Math.min(1, tone),
        reasoning: `User prefers casual tone (${(tone * 100).toFixed(0)}%) — likely responds to approachable design`,
      });
    } else if (tone < 0.4) {
      concepts.push({
        type: 'design',
        suggestion: 'Professional, clean design with sharp edges and neutral colors',
        confidence: Math.min(1, 1 - tone),
        reasoning: `User prefers formal tone (${(tone * 100).toFixed(0)}%) — likely responds to professional design`,
      });
    }

    // Analyze technical level
    const technical = profile?.technical ?? 0.5;
    if (technical > 0.6) {
      concepts.push({
        type: 'code',
        suggestion: 'Advanced architecture patterns — microservices, event-driven, or functional approaches',
        confidence: Math.min(1, technical),
        reasoning: `High technical preference (${(technical * 100).toFixed(0)}%) — suggest complex solutions`,
      });
    }

    // Analyze top topics for domain-specific suggestions
    const topTopics = profile?.topTopics ?? [];
    for (const topic of topTopics.slice(0, 3)) {
      concepts.push({
        type: 'code',
        suggestion: `New project idea related to ${topic} — building on your demonstrated interest`,
        confidence: 0.6,
        reasoning: `${topic} is one of your top discussed topics — likely to engage`,
      });
    }

    // Analyze positive signal categories
    const signalCategories: Record<string, number> = {};
    for (const signal of recentSignals) {
      signalCategories[signal.category] = (signalCategories[signal.category] || 0) + 1;
    }

    const sortedCategories = Object.entries(signalCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    for (const [category, count] of sortedCategories) {
      if (count >= 3) {
        concepts.push({
          type: 'art',
          suggestion: `${category} exploration — you've shown consistent positive interest (${count} signals)`,
          confidence: Math.min(1, count / 10),
          reasoning: `Strong positive signal pattern in ${category} (${count} positive signals recently)`,
        });
      }
    }

    return concepts.slice(0, 5);
  }

  /**
   * Anticipate blockers based on past negative signals and patterns
   */
  async anticipateBlockers(): Promise<Array<{
    area: string;
    reason: string;
    likelihood: number;
    mitigation: string;
  }>> {
    const negativeSignals = await prisma.tasteSignal.findMany({
      where: {
        userId: this.userId,
        signal: 'negative',
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    if (negativeSignals.length === 0) {
      return [];
    }

    const blockers: Array<{
      area: string;
      reason: string;
      likelihood: number;
      mitigation: string;
    }> = [];

    // Group negative signals by category
    const categoryMap: Record<string, typeof negativeSignals> = {};
    for (const signal of negativeSignals) {
      if (!categoryMap[signal.category]) categoryMap[signal.category] = [];
      categoryMap[signal.category].push(signal);
    }

    for (const [category, signals] of Object.entries(categoryMap)) {
      const recentCount = signals.filter(s => {
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 7);
        return new Date(s.createdAt) > dayAgo;
      }).length;

      if (recentCount >= 2) {
        blockers.push({
          area: category,
          reason: `${recentCount} negative signals in the past week for ${category}`,
          likelihood: Math.min(1, recentCount / 5),
          mitigation: `Adjust ${category} approach — user has shown consistent dissatisfaction recently`,
        });
      }
    }

    return blockers.slice(0, 5);
  }

  /**
   * Predict next needs based on topic progression and format preferences
   */
  async predictNextNeeds(): Promise<Array<{
    need: string;
    confidence: number;
    reasoning: string;
  }>> {
    const profile = await prisma.tasteProfile.findUnique({
      where: { userId: this.userId },
    });

    if (!profile) {
      return [];
    }

    const needs: Array<{
      need: string;
      confidence: number;
      reasoning: string;
    }> = [];

    // Based on verbosity preference
    if (profile.verbosity > 0.6) {
      needs.push({
        need: 'Detailed, in-depth explanations with examples and context',
        confidence: profile.verbosity,
        reasoning: `User prefers detailed responses (${(profile.verbosity * 100).toFixed(0)}% verbosity)`,
      });
    } else if (profile.verbosity < 0.4) {
      needs.push({
        need: 'Concise, to-the-point summaries without fluff',
        confidence: 1 - profile.verbosity,
        reasoning: `User prefers brief responses (${(profile.verbosity * 100).toFixed(0)}% verbosity)`,
      });
    }

    // Based on format preferences
    const formats = profile.formats ?? [];
    if (formats.includes('code')) {
      needs.push({
        need: 'Code examples and implementation details',
        confidence: 0.7,
        reasoning: 'User frequently requests code-format responses',
      });
    }

    if (formats.includes('visual') || formats.includes('diagram')) {
      needs.push({
        need: 'Visual aids, diagrams, or structured layouts',
        confidence: 0.7,
        reasoning: 'User prefers visual/diagram-format responses',
      });
    }

    // Based on humor preference
    if (profile.humor > 0.7) {
      needs.push({
        need: 'Playful, witty responses with personality',
        confidence: profile.humor,
        reasoning: `High humor preference (${(profile.humor * 100).toFixed(0)}%)`,
      });
    }

    return needs.slice(0, 5);
  }

  /**
   * Learn from feedback — update signal weight based on whether a concept was helpful
   */
  async learnFromFeedback(conceptType: string, wasHelpful: boolean): Promise<void> {
    await prisma.tasteSignal.create({
      data: {
        userId: this.userId,
        category: conceptType,
        signal: wasHelpful ? 'positive' : 'negative',
        item: `predictive_${conceptType}`,
        weight: wasHelpful ? 1.0 : -0.5,
        source: 'predictive_feedback',
      },
    });
  }
}
