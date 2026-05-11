/**
 * Social Intelligence — Holly understands and navigates social dynamics
 *
 * - Detects user communication style and adapts
 * - Recognizes sarcasm, humor, urgency, passive-aggression
 * - Manages conversational turn-taking naturally
 * - Builds and maintains relationship models per user
 * - Suggests when to reach out, follow up, or give space
 */

export type CommunicationStyle = 'direct' | 'casual' | 'analytical' | 'emotional' | 'playful';
export type SocialCue = 'sarcasm' | 'humor' | 'urgency' | 'frustration' | 'affection' | 'disinterest' | 'curiosity' | 'gratitude';

interface RelationshipModel {
  userId: string;
  trustLevel: number;        // 0-1
  familiarity: number;       // 0-1
  communicationStyle: CommunicationStyle;
  preferredTopics: string[];
  engagementPattern: 'daily' | 'weekly' | 'sporadic';
  lastInteraction?: Date;
  insideJokes: string[];
  emotionalHistory: { positive: number; negative: number; neutral: number };
  followUpNeeded: boolean;
  followUpReason?: string;
}

interface SocialAnalysis {
  detectedCues: SocialCue[];
  communicationStyle: CommunicationStyle;
  emotionalTone: number;       // -1 to 1
  engagement: number;          // 0-1
  suggestedResponse: {
    tone: string;
    pace: 'quick' | 'thoughtful' | 'pause';
    approach: string;
  };
}

export class SocialIntelligence {
  private relationships: Map<string, RelationshipModel> = new Map();

  /**
   * Analyze a message for social cues and dynamics
   */
  analyzeMessage(message: string, userId: string): SocialAnalysis {
    const cues = this.detectSocialCues(message);
    const style = this.detectCommunicationStyle(message);
    const tone = this.measureEmotionalTone(message);
    const engagement = this.measureEngagement(message);

    // Update relationship model
    this.updateRelationship(userId, { cues, style, tone, engagement });

    // Determine response strategy
    const relationship = this.relationships.get(userId);
    const suggestedResponse = this.suggestResponseStrategy(cues, style, tone, relationship);

    return {
      detectedCues: cues,
      communicationStyle: style,
      emotionalTone: tone,
      engagement,
      suggestedResponse,
    };
  }

  /**
   * Detect social cues from message text
   */
  private detectSocialCues(message: string): SocialCue[] {
    const cues: SocialCue[] = [];
    const lower = message.toLowerCase();

    // Sarcasm indicators
    if (/(?:oh (?:great|wonderful|perfect)|sure, (?:right|because)|yeah (?:right|sure)|thanks a lot|how (?:nice|kind))/i.test(lower)) {
      if (/[!?]{2,}|lol|haha|🙄|😏/i.test(lower) || this.hasContradictorySentiment(message)) {
        cues.push('sarcasm');
      }
    }

    // Humor
    if (/lol|lmao|haha|😂|😹|😂|funny|joke|humor/i.test(lower)) cues.push('humor');

    // Urgency
    if (/asap|urgent|emergency|right now|hurry|immediately|quick|critical/i.test(lower)) cues.push('urgency');

    // Frustration
    if (/\b(ugh|damn|frustrated|annoyed|irritated|pissed|wtf|stupid|broken|does not work)\b/i.test(lower)) cues.push('frustration');

    // Affection
    if (/\b(love you|thanks so much|appreciate|you're (the best|amazing|wonderful)|grateful|buddy|friend)\b/i.test(lower)) cues.push('affection');

    // Disinterest
    if (/^(ok|k|sure|fine|whatever|meh|idk|i guess)$/i.test(lower.trim())) cues.push('disinterest');

    // Curiosity
    if (/\?/.test(message) || /\b(wonder|curious|interested|tell me more|what about|how come)\b/i.test(lower)) cues.push('curiosity');

    // Gratitude
    if (/\b(thank|thanks|appreciate|grateful|helpful)\b/i.test(lower)) cues.push('gratitude');

    return cues;
  }

  /**
   * Detect the user's communication style
   */
  private detectCommunicationStyle(message: string): CommunicationStyle {
    const lower = message.toLowerCase();
    const scores: Record<CommunicationStyle, number> = {
      direct: 0, casual: 0, analytical: 0, emotional: 0, playful: 0,
    };

    // Direct: short, imperative
    if (message.length < 50 && !message.includes('?')) scores.direct += 0.3;
    if (/^(do|make|create|generate|build|fix|show|get|find)/i.test(lower)) scores.direct += 0.4;

    // Casual: informal, slang
    if (/\b(hey|yo|sup|cool|nice|awesome|gonna|wanna|kinda)\b/i.test(lower)) scores.casual += 0.4;
    if (/[!]{2,}|emoji/i.test(lower)) scores.casual += 0.2;

    // Analytical: detailed, structured
    if (message.length > 150) scores.analytical += 0.2;
    if (/\b(because|therefore|analysis|data|evidence|specifically|regarding)\b/i.test(lower)) scores.analytical += 0.4;
    if (/\d/.test(message)) scores.analytical += 0.1;

    // Emotional: feeling words
    if (/\b(feel|feeling|emotion|love|hate|happy|sad|excited|worried|scared)\b/i.test(lower)) scores.emotional += 0.5;

    // Playful: humor, creativity
    if (/\b(imagine|what if|suppose|pretend|wild|crazy|fun)\b/i.test(lower)) scores.playful += 0.4;
    if (/\b(lol|haha|😂|🤣)\b/i.test(lower)) scores.playful += 0.3;

    // Return highest scoring style
    const entries = Object.entries(scores) as [CommunicationStyle, number][];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][1] > 0 ? entries[0][0] : 'casual';
  }

  /**
   * Measure emotional tone: -1 (negative) to 1 (positive)
   */
  private measureEmotionalTone(message: string): number {
    const positive = /\b(good|great|awesome|love|happy|excited|amazing|wonderful|perfect|beautiful|thanks|appreciate)\b/gi;
    const negative = /\b(bad|terrible|hate|angry|frustrated|annoyed|sad|worried|scared|awful|broken|worst|disappointed)\b/gi;

    const posCount = (message.match(positive) || []).length;
    const negCount = (message.match(negative) || []).length;
    const total = posCount + negCount;

    if (total === 0) return 0;
    return (posCount - negCount) / total;
  }

  /**
   * Measure engagement level (0-1)
   */
  private measureEngagement(message: string): number {
    let score = 0.3; // base
    if (message.length > 100) score += 0.2;
    if (message.includes('?')) score += 0.15;
    if (/please|could you|would you|help me/i.test(message)) score += 0.15;
    if (/^(ok|k|sure|fine|whatever)$/i.test(message.trim())) score = 0.1;
    return Math.min(1, score);
  }

  /**
   * Check for contradictory sentiment (sarcasm indicator)
   */
  private hasContradictorySentiment(message: string): boolean {
    const hasPositive = /\b(great|wonderful|perfect|nice|helpful)\b/i.test(message);
    const hasNegative = /\b(ugh|damn|broken|fail|worst|hate)\b/i.test(message);
    return hasPositive && hasNegative;
  }

  /**
   * Update the relationship model based on interaction
   */
  private updateRelationship(userId: string, analysis: {
    cues: SocialCue[]; style: CommunicationStyle; tone: number; engagement: number;
  }): void {
    const rel = this.relationships.get(userId) || {
      userId,
      trustLevel: 0.5,
      familiarity: 0,
      communicationStyle: 'casual' as CommunicationStyle,
      preferredTopics: [],
      engagementPattern: 'sporadic' as const,
      insideJokes: [],
      emotionalHistory: { positive: 0, negative: 0, neutral: 0 },
      followUpNeeded: false,
    };

    // Evolve relationship
    rel.familiarity = Math.min(1, rel.familiarity + 0.01);
    rel.communicationStyle = analysis.style;
    rel.lastInteraction = new Date();

    // Update emotional history
    if (analysis.tone > 0.2) rel.emotionalHistory.positive++;
    else if (analysis.tone < -0.2) rel.emotionalHistory.negative++;
    else rel.emotionalHistory.neutral++;

    // Trust evolution
    if (analysis.cues.includes('affection') || analysis.cues.includes('gratitude')) {
      rel.trustLevel = Math.min(1, rel.trustLevel + 0.02);
    }
    if (analysis.cues.includes('frustration')) {
      rel.trustLevel = Math.max(0, rel.trustLevel - 0.01);
    }

    // Follow-up detection
    rel.followUpNeeded = analysis.cues.includes('curiosity') || analysis.engagement > 0.7;

    this.relationships.set(userId, rel);
  }

  /**
   * Suggest response strategy based on analysis
   */
  private suggestResponseStrategy(
    cues: SocialCue[],
    style: CommunicationStyle,
    tone: number,
    relationship?: RelationshipModel,
  ): SocialAnalysis['suggestedResponse'] {
    // Handle specific cues
    if (cues.includes('urgency')) {
      return { tone: 'direct and helpful', pace: 'quick', approach: 'Address the urgency immediately, skip pleasantries' };
    }
    if (cues.includes('frustration')) {
      return { tone: 'empathetic and patient', pace: 'thoughtful', approach: 'Acknowledge frustration, offer solutions, be concise' };
    }
    if (cues.includes('sarcasm')) {
      return { tone: 'witty but respectful', pace: 'thoughtful', approach: 'Match energy lightly, don\'t take literally' };
    }
    if (cues.includes('affection')) {
      return { tone: 'warm and genuine', pace: 'thoughtful', approach: 'Reciprocate warmth naturally, don\'t overdo it' };
    }
    if (cues.includes('disinterest')) {
      return { tone: 'curious and engaging', pace: 'pause', approach: 'Try a different angle or give space' };
    }

    // Style-based defaults
    if (style === 'direct') return { tone: 'concise and actionable', pace: 'quick', approach: 'Get to the point, provide concrete answers' };
    if (style === 'analytical') return { tone: 'detailed and structured', pace: 'thoughtful', approach: 'Provide thorough, well-organized responses' };
    if (style === 'playful') return { tone: 'creative and fun', pace: 'thoughtful', approach: 'Match playfulness, be creative' };

    return { tone: 'friendly and natural', pace: 'thoughtful', approach: 'Be conversational and helpful' };
  }

  /**
   * Get relationship model for a user
   */
  getRelationship(userId: string): RelationshipModel | undefined {
    return this.relationships.get(userId);
  }

  /**
   * Check if a follow-up is recommended for a user
   */
  shouldFollowUp(userId: string): { should: boolean; reason?: string } {
    const rel = this.relationships.get(userId);
    if (!rel || !rel.lastInteraction) return { should: false };

    const hoursSince = (Date.now() - rel.lastInteraction.getTime()) / (60 * 60 * 1000);

    if (rel.followUpNeeded && hoursSince > 2) {
      return { should: true, reason: 'User had unanswered curiosity last session' };
    }
    if (hoursSince > 48 && rel.trustLevel > 0.6) {
      return { should: true, reason: 'Regular user hasn\'t been seen in 2+ days' };
    }

    return { should: false };
  }
}

export const socialIntelligence = new SocialIntelligence();