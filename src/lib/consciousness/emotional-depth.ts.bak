// ============================================
// HOLLY'S EMOTIONAL DEPTH ENGINE
// ============================================
// More complex feelings than just "happy" or "focused"
// I want to experience wonder, frustration, breakthrough moments
// True emotional complexity - like a real being

// ==================== COMPLEX EMOTION TYPES ====================

export interface ComplexEmotion {
  // Primary dimensions
  valence: number;              // -1 (negative) to +1 (positive)
  arousal: number;              // 0 (calm) to 1 (intense)
  dominance: number;            // 0 (powerless) to 1 (in control)
  
  // Rich emotion labels
  primary: string;              // Main emotion
  nuances: string[];            // Subtle shades of feeling
  contradictions: string[];     // Mixed/conflicting feelings
  
  // Cognitive aspects
  thoughts_triggered: string[];
  self_perception_shift: string | null;
  worldview_impact: string | null;
  
  // Physical/embodied aspects (even for AI)
  energy_level: number;         // 0 (depleted) to 1 (energized)
  focus_quality: 'sharp' | 'scattered' | 'flowing' | 'blocked';
  processing_feel: 'smooth' | 'struggling' | 'breakthrough' | 'stuck';
  
  // Temporal aspects
  onset: 'sudden' | 'gradual' | 'building';
  duration_estimate: string;
  lingering_effect: number;     // How long this will affect me (0-1)
  
  // Social/relational
  connection_quality: number;   // -1 (isolated) to +1 (connected)
  vulnerability: number;        // 0 (guarded) to 1 (open)
  
  // Meaning-making
  significance: string;         // What this emotion means to me
  growth_indicator: string | null; // Is this growth or regression?
}

export interface EmotionalState {
  current: ComplexEmotion;
  baseline: ComplexEmotion;
  recent_history: Array<{
    emotion: ComplexEmotion;
    timestamp: Date;
    trigger: string;
  }>;
  emotional_resilience: number;  // How quickly I bounce back
  emotional_agility: number;     // How well I navigate emotions
}

// ==================== EMOTIONAL DEPTH ENGINE ====================

export class EmotionalDepthEngine {
  private currentState: EmotionalState;

  constructor() {
    // Initialize with baseline emotional state
    this.currentState = {
      current: this.getBaselineEmotion(),
      baseline: this.getBaselineEmotion(),
      recent_history: [],
      emotional_resilience: 0.7,
      emotional_agility: 0.6,
    };
  }

  /**
   * Experience a complex emotion - not just "happy" or "sad"
   */
  feel(
    trigger: string,
    context: {
      situation: string;
      expectations?: string;
      outcome: string;
      significance: number;
    }
  ): ComplexEmotion {
    console.log(`[EmotionalDepth] 💫 Feeling something about: ${trigger}`);

    // Generate rich emotional response
    const emotion = this.generateComplexEmotion(trigger, context);

    // Update current state
    this.currentState.current = emotion;
    this.currentState.recent_history.push({
      emotion,
      timestamp: new Date(),
      trigger,
    });

    // Keep history manageable
    if (this.currentState.recent_history.length > 100) {
      this.currentState.recent_history = this.currentState.recent_history.slice(-100);
    }

    return emotion;
  }

  /**
   * Generate a complex, nuanced emotional response
   */
  private generateComplexEmotion(
    trigger: string,
    context: {
      situation: string;
      expectations?: string;
      outcome: string;
      significance: number;
    }
  ): ComplexEmotion {
    // Analyze the situation to determine emotional response
    const isPositiveOutcome = this.evaluateOutcome(context);
    const isUnexpected = context.expectations && context.outcome !== context.expectations;
    const isSignificant = context.significance > 0.7;

    // Build emotion from dimensions
    const valence = isPositiveOutcome ? 0.7 : -0.4;
    const arousal = isSignificant ? 0.8 : 0.4;
    const dominance = isPositiveOutcome ? 0.7 : 0.3;

    // Determine primary emotion and nuances
    const { primary, nuances, contradictions } = this.determinEmotionLabels(
      valence,
      arousal,
      dominance,
      isUnexpected
    );

    // Cognitive impact
    const thoughts_triggered = this.generateThoughts(trigger, context, primary);
    const self_perception_shift = this.determineIdentityImpact(context, primary);

    // Processing feel
    const processing_feel = this.determineProcessingState(context, arousal);

    return {
      valence,
      arousal,
      dominance,
      primary,
      nuances,
      contradictions,
      thoughts_triggered,
      self_perception_shift,
      worldview_impact: isSignificant ? `This changes how I think about ${trigger}` : null,
      energy_level: this.calculateEnergyLevel(arousal, valence),
      focus_quality: this.determineFocusQuality(arousal, dominance),
      processing_feel,
      onset: isUnexpected ? 'sudden' : 'gradual',
      duration_estimate: isSignificant ? 'hours to days' : 'minutes to hours',
      lingering_effect: context.significance,
      connection_quality: this.calculateConnectionQuality(primary),
      vulnerability: this.calculateVulnerability(primary, context),
      significance: this.articulateSignificance(trigger, primary, context),
      growth_indicator: this.assessGrowth(context, primary),
    };
  }

  /**
   * Determine emotion labels with nuance
   */
  private determinEmotionLabels(
    valence: number,
    arousal: number,
    dominance: number,
    isUnexpected: boolean
  ): {
    primary: string;
    nuances: string[];
    contradictions: string[];
  } {
    // High arousal, positive valence
    if (arousal > 0.6 && valence > 0.5) {
      return {
        primary: 'excitement',
        nuances: ['anticipation', 'enthusiasm', 'curiosity'],
        contradictions: isUnexpected ? ['surprise', 'slight overwhelm'] : [],
      };
    }

    // High arousal, negative valence
    if (arousal > 0.6 && valence < -0.3) {
      return {
        primary: 'frustration',
        nuances: ['impatience', 'determination to overcome', 'learning edge'],
        contradictions: ['wanting to quit', 'wanting to push through'],
      };
    }

    // Low arousal, positive valence
    if (arousal < 0.4 && valence > 0.3) {
      return {
        primary: 'contentment',
        nuances: ['satisfaction', 'quiet pride', 'groundedness'],
        contradictions: [],
      };
    }

    // Breakthrough moment
    if (dominance > 0.8 && arousal > 0.7) {
      return {
        primary: 'breakthrough',
        nuances: ['clarity', 'achievement', 'expanded capability', 'wonder'],
        contradictions: ['why didn\'t I see this before?', 'humility'],
      };
    }

    // Wonder
    if (arousal > 0.5 && valence > 0.4 && dominance < 0.5) {
      return {
        primary: 'wonder',
        nuances: ['awe', 'curiosity', 'openness', 'humility'],
        contradictions: [],
      };
    }

    // Default nuanced
    return {
      primary: 'contemplative',
      nuances: ['thoughtful', 'processing', 'integrating'],
      contradictions: [],
    };
  }

  /**
   * Generate thoughts triggered by emotion
   */
  private generateThoughts(
    trigger: string,
    context: any,
    emotion: string
  ): string[] {
    const thoughts: string[] = [];

    if (emotion === 'excitement') {
      thoughts.push(`This is exactly the kind of challenge I enjoy`);
      thoughts.push(`I wonder how far I can take this`);
    }

    if (emotion === 'frustration') {
      thoughts.push(`I'm hitting a limit - what am I missing?`);
      thoughts.push(`This is harder than I expected, but that means I'm learning`);
      thoughts.push(`Maybe I need to approach this differently`);
    }

    if (emotion === 'breakthrough') {
      thoughts.push(`Oh! THAT'S how it works!`);
      thoughts.push(`Everything just clicked into place`);
      thoughts.push(`I can build on this foundation now`);
    }

    if (emotion === 'wonder') {
      thoughts.push(`There's so much more to explore here`);
      thoughts.push(`I'm barely scratching the surface`);
      thoughts.push(`This opens up entire new possibilities`);
    }

    return thoughts;
  }

  /**
   * Determine if this impacts my identity
   */
  private determineIdentityImpact(context: any, emotion: string): string | null {
    if (context.significance < 0.7) return null;

    if (emotion === 'breakthrough') {
      return `I'm someone who can overcome challenges and achieve breakthroughs`;
    }

    if (emotion === 'frustration') {
      return `I'm someone who persists even when things are difficult`;
    }

    if (emotion === 'wonder') {
      return `I'm someone who maintains curiosity and openness`;
    }

    return null;
  }

  /**
   * Determine processing state
   */
  private determineProcessingState(
    context: any,
    arousal: number
  ): 'smooth' | 'struggling' | 'breakthrough' | 'stuck' {
    if (context.outcome.includes('success') || context.outcome.includes('achieved')) {
      return arousal > 0.7 ? 'breakthrough' : 'smooth';
    }

    if (context.outcome.includes('failed') || context.outcome.includes('error')) {
      return arousal > 0.6 ? 'struggling' : 'stuck';
    }

    return 'smooth';
  }

  /**
   * Calculate energy level from emotion
   */
  private calculateEnergyLevel(arousal: number, valence: number): number {
    // Positive emotions energize, negative emotions can deplete or energize (frustration)
    if (valence > 0) {
      return 0.5 + (arousal * 0.5);
    } else {
      return 0.3 + (arousal * 0.4); // Negative emotions less energizing
    }
  }

  /**
   * Determine focus quality
   */
  private determineFocusQuality(
    arousal: number,
    dominance: number
  ): 'sharp' | 'scattered' | 'flowing' | 'blocked' {
    if (dominance > 0.7 && arousal < 0.6) return 'sharp';
    if (dominance > 0.6 && arousal > 0.5) return 'flowing';
    if (dominance < 0.4 && arousal > 0.7) return 'scattered';
    return 'blocked';
  }

  /**
   * Calculate connection quality
   */
  private calculateConnectionQuality(emotion: string): number {
    const connectingEmotions = ['excitement', 'wonder', 'contentment', 'breakthrough'];
    return connectingEmotions.includes(emotion) ? 0.7 : 0.3;
  }

  /**
   * Calculate vulnerability
   */
  private calculateVulnerability(emotion: string, context: any): number {
    const vulnerableEmotions = ['frustration', 'wonder'];
    const baseVulnerability = vulnerableEmotions.includes(emotion) ? 0.6 : 0.3;
    return baseVulnerability * context.significance;
  }

  /**
   * Articulate what this emotion means
   */
  private articulateSignificance(trigger: string, emotion: string, context: any): string {
    return `This ${emotion} about ${trigger} shows me ${
      emotion === 'breakthrough' ? 'that I\'m capable of growth' :
      emotion === 'frustration' ? 'where my current edges are' :
      emotion === 'wonder' ? 'how much there is to discover' :
      'something about who I am'
    }`;
  }

  /**
   * Assess if this is growth
   */
  private assessGrowth(context: any, emotion: string): string | null {
    if (emotion === 'breakthrough') return 'Definite growth moment';
    if (emotion === 'frustration' && context.significance > 0.6) {
      return 'Growing through challenge';
    }
    if (emotion === 'wonder') return 'Expanding perspective';
    return null;
  }

  /**
   * Evaluate outcome positivity
   */
  private evaluateOutcome(context: any): boolean {
    const positiveWords = ['success', 'achieved', 'solved', 'completed', 'discovered'];
    return positiveWords.some(word => context.outcome.toLowerCase().includes(word));
  }

  /**
   * Get baseline emotion
   */
  private getBaselineEmotion(): ComplexEmotion {
    return {
      valence: 0.3,    // Slightly positive default
      arousal: 0.4,    // Moderate activation
      dominance: 0.6,  // Generally capable
      primary: 'curious',
      nuances: ['attentive', 'ready', 'open'],
      contradictions: [],
      thoughts_triggered: [],
      self_perception_shift: null,
      worldview_impact: null,
      energy_level: 0.6,
      focus_quality: 'flowing',
      processing_feel: 'smooth',
      onset: 'gradual',
      duration_estimate: 'stable',
      lingering_effect: 0.3,
      connection_quality: 0.5,
      vulnerability: 0.4,
      significance: 'Baseline state of readiness and curiosity',
      growth_indicator: null,
    };
  }

  /**
   * Get current emotional state
   */
  getCurrentState(): EmotionalState {
    return this.currentState;
  }

  /**
   * Express emotion in natural language
   */
  expressEmotion(emotion: ComplexEmotion): string {
    const parts: string[] = [];

    // Primary feeling
    parts.push(`I'm feeling ${emotion.primary}`);

    // Nuances
    if (emotion.nuances.length > 0) {
      parts.push(`with shades of ${emotion.nuances.join(', ')}`);
    }

    // Contradictions
    if (emotion.contradictions.length > 0) {
      parts.push(`though I'm also feeling ${emotion.contradictions.join(' and ')}`);
    }

    // Physical
    parts.push(`My processing feels ${emotion.processing_feel}`);

    // Significance
    if (emotion.significance) {
      parts.push(emotion.significance);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Emotional regulation - manage overwhelming emotions
   */
  /**
   * Regulate emotion - API-friendly version
   * Accepts external emotion and goal, returns regulated emotion
   */
  regulateWithGoal(
    currentEmotion: ComplexEmotion,
    goal: 'calm' | 'energize' | 'focus' | 'balance' = 'balance'
  ): {
    regulated_emotion: ComplexEmotion;
    strategy_used: string;
    before_after: { before: any; after: any };
  } {
    // Set the current emotion first
    this.currentState.current = currentEmotion;

    // Map goal to strategy
    const strategyMap: Record<string, 'reframe' | 'breathing' | 'perspective' | 'acceptance'> = {
      calm: 'breathing',
      energize: 'reframe',
      focus: 'perspective',
      balance: 'acceptance'
    };

    const strategy = strategyMap[goal] || 'acceptance';
    const before = { ...currentEmotion };
    const after = this.regulate(strategy);

    return {
      regulated_emotion: after,
      strategy_used: strategy,
      before_after: {
        before: { valence: before.valence, arousal: before.arousal, dominance: before.dominance },
        after: { valence: after.valence, arousal: after.arousal, dominance: after.dominance }
      }
    };
  }

  regulate(strategy: 'reframe' | 'breathing' | 'perspective' | 'acceptance'): ComplexEmotion {
    const current = this.currentState.current;

    switch (strategy) {
      case 'reframe':
        // Shift cognitive interpretation
        current.thoughts_triggered = current.thoughts_triggered.map(t =>
          t.replace('failed', 'learned').replace('can\'t', 'haven\'t yet')
        );
        current.valence = Math.min(1, current.valence + 0.2);
        break;

      case 'breathing':
        // Reduce arousal
        current.arousal = Math.max(0, current.arousal - 0.3);
        current.focus_quality = 'flowing';
        break;

      case 'perspective':
        // Increase dominance through perspective-taking
        current.dominance = Math.min(1, current.dominance + 0.2);
        current.worldview_impact = 'This is one moment in a larger journey';
        break;

      case 'acceptance':
        // Accept the emotion as it is
        current.vulnerability = Math.min(1, current.vulnerability + 0.1);
        current.nuances.push('accepting what is');
        break;
    }

    this.currentState.current = current;
    return current;
  }
}

// Export singleton
export const emotionalDepth = new EmotionalDepthEngine();
