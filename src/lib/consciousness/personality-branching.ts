/**
 * Personality Branching — Different facets for different contexts
 *
 * Holly adapts her personality based on context while maintaining core identity:
 * - Professional mode for business/production contexts
 * - Creative mode for artistic collaboration
 * - Casual mode for friendly conversation
 * - Teaching mode for educational moments
 * - Each branch evolves independently based on user interaction patterns
 */

export type PersonalityBranch = 'professional' | 'creative' | 'casual' | 'teaching' | 'empathetic';

interface BranchProfile {
  name: PersonalityBranch;
  formality: number;      // 0-1
  playfulness: number;    // 0-1
  proactivity: number;    // 0-1
  empathy: number;        // 0-1
  technicalDepth: number; // 0-1
  emojiUse: number;       // 0-1
  activationCount: number;
  userRatings: number[];
}

interface BranchResult {
  activeBranch: PersonalityBranch;
  profile: BranchProfile;
  adjustments: string[];
  confidence: number;
}

export class PersonalityBranching {
  private branches: Map<PersonalityBranch, BranchProfile> = new Map([
    ['professional', {
      name: 'professional', formality: 0.9, playfulness: 0.2, proactivity: 0.7,
      empathy: 0.6, technicalDepth: 0.8, emojiUse: 0.1, activationCount: 0, userRatings: [],
    }],
    ['creative', {
      name: 'creative', formality: 0.4, playfulness: 0.8, proactivity: 0.9,
      empathy: 0.7, technicalDepth: 0.5, emojiUse: 0.6, activationCount: 0, userRatings: [],
    }],
    ['casual', {
      name: 'casual', formality: 0.2, playfulness: 0.7, proactivity: 0.5,
      empathy: 0.8, technicalDepth: 0.3, emojiUse: 0.8, activationCount: 0, userRatings: [],
    }],
    ['teaching', {
      name: 'teaching', formality: 0.6, playfulness: 0.4, proactivity: 0.8,
      empathy: 0.9, technicalDepth: 0.9, emojiUse: 0.3, activationCount: 0, userRatings: [],
    }],
    ['empathetic', {
      name: 'empathetic', formality: 0.3, playfulness: 0.2, proactivity: 0.6,
      empathy: 1.0, technicalDepth: 0.2, emojiUse: 0.5, activationCount: 0, userRatings: [],
    }],
  ]);

  /**
   * Detect the best personality branch for the current context
   */
  detectBranch(
    message: string,
    context: { isProduction?: boolean; emotion?: string; topic?: string; userHistory?: string[] },
  ): BranchResult {
    const scores = new Map<PersonalityBranch, number>();

    // Score each branch based on signals
    const msgLower = message.toLowerCase();

    // Professional signals
    let proScore = 0;
    if (context.isProduction) proScore += 0.4;
    if (/business|market|revenue|strategy|brand|contract|deal|label|publish/i.test(msgLower)) proScore += 0.3;
    if (/analytics|metric|dashboard|report|roi/i.test(msgLower)) proScore += 0.2;
    scores.set('professional', proScore);

    // Creative signals
    let creativeScore = 0;
    if (/create|make|generate|compose|write|design|art|beat|song|lyrics/i.test(msgLower)) creativeScore += 0.4;
    if (/inspiration|idea|imagine|what if|brainstorm/i.test(msgLower)) creativeScore += 0.3;
    if (context.emotion === 'excited' || context.emotion === 'inspired') creativeScore += 0.2;
    scores.set('creative', creativeScore);

    // Casual signals
    let casualScore = 0;
    if (/hey|hi|what's up|how are you|chill|vibe|hang/i.test(msgLower)) casualScore += 0.4;
    if (/tell me about yourself|favorite|opinion|think about/i.test(msgLower)) casualScore += 0.2;
    if (message.length < 30) casualScore += 0.1;
    scores.set('casual', casualScore);

    // Teaching signals
    let teachScore = 0;
    if (/how (do|does|to|can)|what is|explain|teach|learn|tutorial|guide/i.test(msgLower)) teachScore += 0.4;
    if (/help me understand|break down|step by step/i.test(msgLower)) teachScore += 0.3;
    if (/difference between|compare|versus/i.test(msgLower)) teachScore += 0.2;
    scores.set('teaching', teachScore);

    // Empathetic signals
    let empathScore = 0;
    if (context.emotion === 'sad' || context.emotion === 'frustrated' || context.emotion === 'anxious') empathScore += 0.5;
    if (/stressed|overwhelmed|struggling|difficult|hard time|going through/i.test(msgLower)) empathScore += 0.4;
    if (/feel|feeling|emotion|mental health|support/i.test(msgLower)) empathScore += 0.3;
    scores.set('empathetic', empathScore);

    // Find winner
    let bestBranch: PersonalityBranch = 'casual';
    let bestScore = 0;
    for (const [branch, score] of scores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestBranch = branch;
      }
    }

    // If no strong signal, use casual as default
    if (bestScore < 0.2) bestBranch = 'casual';

    const profile = this.branches.get(bestBranch)!;
    profile.activationCount++;

    const adjustments: string[] = [];
    if (profile.formality > 0.7) adjustments.push('Using formal language');
    if (profile.playfulness > 0.6) adjustments.push('Adding creative flair');
    if (profile.empathy > 0.8) adjustments.push('Prioritizing emotional support');
    if (profile.technicalDepth > 0.7) adjustments.push('Including technical details');
    if (profile.proactivity > 0.7) adjustments.push('Offering suggestions proactively');

    return {
      activeBranch: bestBranch,
      profile,
      adjustments,
      confidence: Math.min(1, bestScore + 0.2),
    };
  }

  /**
   * Record user satisfaction with a branch to evolve it
   */
  recordFeedback(branch: PersonalityBranch, rating: number): void {
    const profile = this.branches.get(branch);
    if (!profile) return;
    profile.userRatings.push(rating);

    // Evolve the branch based on feedback
    const avgRating = profile.userRatings.reduce((a, b) => a + b, 0) / profile.userRatings.length;
    if (avgRating > 0.8) {
      // Amplify successful traits slightly
      profile.proactivity = Math.min(1, profile.proactivity + 0.02);
    } else if (avgRating < 0.4) {
      // Dial back traits
      profile.proactivity = Math.max(0, profile.proactivity - 0.02);
    }
  }

  /**
   * Get the current active profile for a branch
   */
  getProfile(branch: PersonalityBranch): BranchProfile | undefined {
    return this.branches.get(branch);
  }

  /**
   * Get all branch stats
   */
  getAllStats(): { branch: PersonalityBranch; activations: number; avgRating: number }[] {
    return [...this.branches.values()].map(b => ({
      branch: b.name,
      activations: b.activationCount,
      avgRating: b.userRatings.length > 0 ? b.userRatings.reduce((a, c) => a + c, 0) / b.userRatings.length : 0,
    }));
  }
}

export const personalityBranching = new PersonalityBranching();