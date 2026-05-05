/**
 * HOLLY Taste Matrix — Phase 4
 *
 * Aggregates all past A&R critiques and music analyses into a single 
 * "Artist Genetic Profile". This allows HOLLY to understand the user's
 * evolving musical DNA over time.
 */

import { prisma } from '@/lib/db';
import { semanticSearch } from '@/lib/memory/semantic-memory';

export interface ArtistGeneticProfile {
  averageHitScore: number;
  topStrengths:    string[];
  recurringConcerns: string[];
  genreDNA:        Record<string, number>;
  evolutionTrend:  'rising' | 'stable' | 'needs-pivot';
  lastCritique:    string | null;
}

/**
 * Generates a summary of the user's musical identity based on all known 
 * analyses and critiques.
 */
export async function getArtistGeneticProfile(userId: string): Promise<ArtistGeneticProfile> {
  // 1. Fetch analyzed music tracks and their scores
  const analyses = await prisma.musicAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  // 2. Fetch semantic critiques from memory
  const critiques = await semanticSearch(userId, "music production songwriting style", {
    limit: 10,
    types: ['music_critique']
  });

  // 3. Aggregate scores
  const hitScores = analyses.filter(a => a.hitScore !== null).map(a => a.hitScore! * 10); // scale to 100
  const avgScore = hitScores.length > 0 
    ? hitScores.reduce((a, b) => a + b, 0) / hitScores.length 
    : 0;

  // 4. Extract recurring patterns from critiques (primitive NLP/keyword check for now)
  const allStrengths: string[] = [];
  const allConcerns: string[] = [];
  
  critiques.forEach(c => {
    const content = c.content.toLowerCase();
    // Simple extraction logic - better served by LLM summary in future phases
    if (content.includes('strengths:')) {
      const strengths = content.split('strengths:')[1].split('\n')[0].split(',');
      allStrengths.push(...strengths.map(s => s.trim()));
    }
    if (content.includes('concerns:')) {
      const concerns = content.split('concerns:')[1].split('\n')[0].split(',');
      allConcerns.push(...concerns.map(c => c.trim()));
    }
  });

  // 5. Build DNA profile
  const genreDNA: Record<string, number> = {};
  analyses.forEach(a => {
    if (a.primaryGenre) {
      genreDNA[a.primaryGenre] = (genreDNA[a.primaryGenre] || 0) + 1;
    }
  });

  // 6. Trend calculation
  let evolutionTrend: ArtistGeneticProfile['evolutionTrend'] = 'stable';
  if (hitScores.length >= 3) {
    const recent = hitScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = hitScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recent > older + 5) evolutionTrend = 'rising';
    else if (recent < older - 10) evolutionTrend = 'needs-pivot';
  }

  return {
    averageHitScore: Math.round(avgScore),
    topStrengths:    Array.from(new Set(allStrengths)).slice(0, 5),
    recurringConcerns: Array.from(new Set(allConcerns)).slice(0, 5),
    genreDNA,
    evolutionTrend,
    lastCritique: critiques[0]?.content || null
  };
}

/**
 * Builds a prompt injection block for HOLLY's A&R executive persona
 */
export async function getTasteMatrixPromptInjection(userId: string): Promise<string> {
  try {
    const profile = await getArtistGeneticProfile(userId);
    
    if (profile.averageHitScore === 0 && !profile.lastCritique) {
      return '';
    }

    const genres = Object.keys(profile.genreDNA).join(', ');
    
    return `
## ARTIST GENETIC PROFILE (The Taste Matrix)
You have analyzed this artist's work across multiple sessions. Here is their musical DNA:
- **Avg. Billboard Rating**: ${profile.averageHitScore}/100
- **Evolution Trend**: ${profile.evolutionTrend.toUpperCase()}
- **Core Genres**: ${genres || 'Unknown'}
- **Recurring Strengths**: ${profile.topStrengths.join(', ') || 'Consistent potential'}
- **Recurring Hurdles**: ${profile.recurringConcerns.join(', ') || 'None identified yet'}

**A&R Directive**: Recognize the artist's growth. If they are repeating the same mistakes (concerns), be firmer in your critique. If they've improved in a previously weak area, acknowledge it. You are a career partner, not a one-time reviewer.`;
  } catch (err) {
    console.error('[Taste Matrix] Injection failed:', err);
    return '';
  }
}
