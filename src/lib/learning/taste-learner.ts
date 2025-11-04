/**
 * Taste Learning System
 * 
 * Learns your preferences WITHOUT being told
 * Understands aesthetic preferences, music taste, creative style
 * Adapts suggestions based on learned taste
 */

import { createClient } from '@supabase/supabase-js';

export interface TasteProfile {
  userId: string;
  
  // Visual Preferences
  colorPreferences: string[]; // hex colors you gravitate to
  designStyles: string[]; // minimalist, bold, retro, etc.
  layoutPreferences: string[]; // grid, asymmetric, centered, etc.
  
  // Music Preferences
  genres: Record<string, number>; // genre → preference score 0-100
  tempoRange: { min: number; max: number };
  energyLevel: number; // 0-100
  moodPreferences: string[];
  
  // Creative Style
  workingStyle: 'iterative' | 'perfectionist' | 'experimental' | 'methodical';
  riskTolerance: number; // 0-100
  detailOrientation: number; // 0-100
  conceptualThinking: number; // 0-100
  
  // Content Preferences
  contentTone: string[]; // professional, casual, witty, serious
  complexityLevel: 'simple' | 'moderate' | 'complex';
  verbalStyle: 'concise' | 'detailed' | 'conversational';
  
  // Learned Patterns
  successfulPatterns: TastePattern[];
  avoidedPatterns: TastePattern[];
  
  // Confidence scores
  confidence: {
    visual: number;
    musical: number;
    creative: number;
    content: number;
  };
  
  lastUpdated: Date;
}

export interface TastePattern {
  category: string;
  pattern: string;
  frequency: number;
  successRate: number;
  examples: string[];
}

export interface TasteSignal {
  type: 'like' | 'dislike' | 'neutral' | 'love' | 'hate';
  category: 'visual' | 'music' | 'content' | 'interaction';
  item: any;
  context: string;
  timestamp: Date;
}

export class TasteLearner {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );
  }

  /**
   * Initialize taste profile for new user
   */
  async initializeTasteProfile(userId: string): Promise<TasteProfile> {
    const profile: TasteProfile = {
      userId,
      colorPreferences: [],
      designStyles: [],
      layoutPreferences: [],
      genres: {},
      tempoRange: { min: 80, max: 140 },
      energyLevel: 50,
      moodPreferences: [],
      workingStyle: 'iterative',
      riskTolerance: 50,
      detailOrientation: 50,
      conceptualThinking: 50,
      contentTone: [],
      complexityLevel: 'moderate',
      verbalStyle: 'conversational',
      successfulPatterns: [],
      avoidedPatterns: [],
      confidence: {
        visual: 0,
        musical: 0,
        creative: 0,
        content: 0
      },
      lastUpdated: new Date()
    };

    await this.supabase
      .from('taste_profiles')
      .insert(profile);

    return profile;
  }

  /**
   * Record a taste signal (implicit preference learning)
   */
  async recordTasteSignal(userId: string, signal: TasteSignal): Promise<void> {
    // Store signal
    await this.supabase
      .from('taste_signals')
      .insert({
        userId,
        ...signal
      });

    // Update taste profile based on signal
    await this.updateTasteProfile(userId, signal);
  }

  /**
   * Learn from user's choices
   */
  async learnFromChoice(
    userId: string,
    chosen: any,
    alternatives: any[],
    category: string
  ): Promise<void> {
    // Record what was chosen
    await this.recordTasteSignal(userId, {
      type: 'like',
      category: category as any,
      item: chosen,
      context: 'choice',
      timestamp: new Date()
    });

    // Analyze what made it stand out
    const features = this.extractFeatures(chosen, category);
    
    // Update preferences
    await this.reinforcePreferences(userId, features, category);
  }

  /**
   * Learn from user's reactions
   */
  async learnFromReaction(
    userId: string,
    item: any,
    reaction: 'positive' | 'negative' | 'neutral',
    category: string
  ): Promise<void> {
    const signalType = reaction === 'positive' ? 'like' : reaction === 'negative' ? 'dislike' : 'neutral';
    
    await this.recordTasteSignal(userId, {
      type: signalType,
      category: category as any,
      item,
      context: 'reaction',
      timestamp: new Date()
    });
  }

  /**
   * Learn from successful outcomes
   */
  async learnFromSuccess(
    userId: string,
    project: any,
    outcome: string
  ): Promise<void> {
    // Analyze what worked
    const patterns = this.detectSuccessPatterns(project);
    
    // Get current profile
    const { data: profile } = await this.supabase
      .from('taste_profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    if (!profile) return;

    // Add to successful patterns
    const successfulPatterns = [
      ...profile.successfulPatterns,
      ...patterns.map(p => ({
        ...p,
        successRate: 100,
        examples: [project.name]
      }))
    ];

    await this.supabase
      .from('taste_profiles')
      .update({ successfulPatterns })
      .eq('userId', userId);
  }

  /**
   * Predict if user will like something
   */
  async predictPreference(
    userId: string,
    item: any,
    category: string
  ): Promise<{
    score: number; // 0-100
    confidence: number; // 0-100
    reasoning: string[];
  }> {
    const { data: profile } = await this.supabase
      .from('taste_profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    if (!profile) {
      return {
        score: 50,
        confidence: 0,
        reasoning: ['No taste profile data yet']
      };
    }

    // Extract features from item
    const features = this.extractFeatures(item, category);
    
    // Compare with known preferences
    const matches = this.calculateFeatureMatches(features, profile, category);
    
    // Calculate score
    const score = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
    const confidence = profile.confidence[category as keyof typeof profile.confidence] || 0;

    return {
      score,
      confidence,
      reasoning: matches
        .filter(m => m.score > 60)
        .map(m => m.reason)
    };
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    userId: string,
    category: string,
    options: any[]
  ): Promise<{
    item: any;
    score: number;
    reasoning: string[];
  }[]> {
    const scored = await Promise.all(
      options.map(async (item) => {
        const prediction = await this.predictPreference(userId, item, category);
        return {
          item,
          score: prediction.score,
          reasoning: prediction.reasoning
        };
      })
    );

    // Sort by score
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Adapt creative suggestions based on taste
   */
  async adaptSuggestion(
    userId: string,
    baseSuggestion: string,
    context: string
  ): Promise<string> {
    const { data: profile } = await this.supabase
      .from('taste_profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    if (!profile) return baseSuggestion;

    // Adapt based on verbal style
    if (profile.verbalStyle === 'concise') {
      return `${baseSuggestion.split('.')[0]}.`;
    } else if (profile.verbalStyle === 'detailed') {
      return `${baseSuggestion} [Would you like me to elaborate on this?]`;
    }

    // Adapt based on tone preferences
    if (profile.contentTone.includes('professional')) {
      return baseSuggestion.replace(/!/g, '.');
    }

    return baseSuggestion;
  }

  /**
   * Update taste profile from signal
   */
  private async updateTasteProfile(userId: string, signal: TasteSignal): Promise<void> {
    const { data: profile } = await this.supabase
      .from('taste_profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    if (!profile) return;

    // Extract features and update relevant preferences
    const features = this.extractFeatures(signal.item, signal.category);
    
    // Update based on signal type
    if (signal.type === 'like' || signal.type === 'love') {
      await this.reinforcePreferences(userId, features, signal.category);
    } else if (signal.type === 'dislike' || signal.type === 'hate') {
      await this.weakenPreferences(userId, features, signal.category);
    }

    // Increase confidence
    const newConfidence = Math.min(
      100,
      (profile.confidence[signal.category] || 0) + 1
    );

    await this.supabase
      .from('taste_profiles')
      .update({
        confidence: {
          ...profile.confidence,
          [signal.category]: newConfidence
        },
        lastUpdated: new Date()
      })
      .eq('userId', userId);
  }

  /**
   * Extract features from item
   */
  private extractFeatures(item: any, category: string): Record<string, any> {
    // Extract relevant features based on category
    const features: Record<string, any> = {};

    if (category === 'visual') {
      features.colors = item.colors || [];
      features.style = item.style || '';
      features.layout = item.layout || '';
    } else if (category === 'music') {
      features.genre = item.genre || '';
      features.tempo = item.tempo || 0;
      features.energy = item.energy || 0;
      features.mood = item.mood || '';
    }

    return features;
  }

  /**
   * Calculate how features match preferences
   */
  private calculateFeatureMatches(
    features: Record<string, any>,
    profile: TasteProfile,
    category: string
  ): { score: number; reason: string }[] {
    const matches: { score: number; reason: string }[] = [];

    if (category === 'visual') {
      // Check color matches
      if (features.colors && profile.colorPreferences.length > 0) {
        const colorMatch = features.colors.some((c: string) => 
          profile.colorPreferences.includes(c)
        );
        if (colorMatch) {
          matches.push({ score: 80, reason: 'Uses your preferred colors' });
        }
      }

      // Check style matches
      if (features.style && profile.designStyles.includes(features.style)) {
        matches.push({ score: 90, reason: `Matches your ${features.style} style preference` });
      }
    } else if (category === 'music') {
      // Check genre match
      if (features.genre && profile.genres[features.genre]) {
        const genreScore = profile.genres[features.genre];
        matches.push({ score: genreScore, reason: `${features.genre} is your preferred genre` });
      }

      // Check tempo range
      if (features.tempo >= profile.tempoRange.min && features.tempo <= profile.tempoRange.max) {
        matches.push({ score: 70, reason: 'Tempo is in your preferred range' });
      }
    }

    return matches.length > 0 ? matches : [{ score: 50, reason: 'No strong preferences detected yet' }];
  }

  /**
   * Reinforce preferences
   */
  private async reinforcePreferences(
    userId: string,
    features: Record<string, any>,
    category: string
  ): Promise<void> {
    // Increase preference scores for these features
    const { data: profile } = await this.supabase
      .from('taste_profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    if (!profile) return;

    // Update relevant preferences based on features
    // (Implementation would update specific preference fields)
  }

  /**
   * Weaken preferences
   */
  private async weakenPreferences(
    userId: string,
    features: Record<string, any>,
    category: string
  ): Promise<void> {
    // Decrease preference scores for these features
  }

  /**
   * Detect success patterns
   */
  private detectSuccessPatterns(project: any): TastePattern[] {
    // Analyze project for patterns that led to success
    return [];
  }
}

// Export singleton instance
export const tasteLearner = new TasteLearner();
