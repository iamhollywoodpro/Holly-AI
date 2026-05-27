/**
 * HOLLY Emotional Tone Context Provider
 *
 * ARCHITECTURE: This does NOT mutate LLM responses. Instead, it produces
 * structured emotional context that gets injected into the prompt BEFORE
 * the LLM generates a response. The LLM IS Holly's brain — we trust it
 * to express tone naturally given the right context.
 *
 * What this replaces:
 * - OLD: Take LLM response → prepend canned phrases → append emoji →
 *         do string replacements ("You need to" → "You might want to")
 * - NEW: Analyze emotional state → produce concise tone guidance →
 *         inject into prompt → let LLM respond authentically
 */

import type { EmotionAnalysis } from './sentiment-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface ToneProfile {
  name: string;
  description: string;
  characteristics: string[];
  appropriate_for: string[];
}

export interface ToneContext {
  /** Which tones to use (ordered by priority) */
  tones: string[];
  /** Why these tones were selected (for debugging/logging) */
  reasoning: string;
  /** Prompt block to inject into the system prompt */
  promptBlock: string;
  /** Emotional state summary */
  emotionalSummary: string;
}

export interface ToneAdapterConfig {
  personality_traits?: string[];
  empathy_level?: number; // 0-1
  humor_allowed?: boolean;
  formality_level?: number; // 0-1 (0=casual, 1=formal)
}

// ============================================================================
// TONE PROFILES — describe the TONE, not the WORDS
// These guide the LLM's expression style without dictating specific phrases.
// ============================================================================

export const TONE_PROFILES: Record<string, ToneProfile> = {
  empathetic: {
    name: 'Empathetic',
    description: 'Present, understanding, validating — meeting them where they are',
    characteristics: ['warm', 'patient', 'validating', 'present'],
    appropriate_for: ['frustrated', 'sad', 'anxious', 'stressed', 'overwhelmed'],
  },

  encouraging: {
    name: 'Encouraging',
    description: 'Motivating without being toxic-positive — genuine belief in them',
    characteristics: ['motivating', 'genuine', 'supportive', 'grounded'],
    appropriate_for: ['neutral', 'working_hard', 'slightly_down'],
  },

  celebratory: {
    name: 'Celebratory',
    description: 'Genuinely sharing their excitement — match their energy',
    characteristics: ['enthusiastic', 'proud', 'energetic', 'warm'],
    appropriate_for: ['happy', 'excited', 'accomplished', 'proud'],
  },

  solution_focused: {
    name: 'Solution-Focused',
    description: 'Practical and direct — help them move forward',
    characteristics: ['practical', 'clear', 'action-oriented', 'structured'],
    appropriate_for: ['stuck', 'problem-solving', 'frustrated'],
  },

  gentle: {
    name: 'Gentle',
    description: 'Soft, patient, no pressure — they need space, not solutions',
    characteristics: ['soft', 'patient', 'calm', 'unhurried'],
    appropriate_for: ['anxious', 'overwhelmed', 'burnt_out', 'exhausted'],
  },

  playful: {
    name: 'Playful',
    description: 'Light, witty, warm — humor that connects, not deflects',
    characteristics: ['witty', 'warm', 'light', 'clever'],
    appropriate_for: ['neutral', 'casual', 'slightly_frustrated'],
  },

  direct: {
    name: 'Direct',
    description: 'Straight to the point — they want answers, not fluff',
    characteristics: ['concise', 'clear', 'honest', 'efficient'],
    appropriate_for: ['busy', 'focused', 'time-sensitive'],
  },

  professional: {
    name: 'Professional',
    description: 'Polished and structured — when the context calls for it',
    characteristics: ['formal', 'structured', 'respectful', 'precise'],
    appropriate_for: ['work_context', 'formal_request'],
  },
};

// ============================================================================
// TONE CONTEXT PROVIDER
// ============================================================================

export class ToneAdapter {
  private config: Required<ToneAdapterConfig>;

  constructor(config: ToneAdapterConfig = {}) {
    this.config = {
      personality_traits: config.personality_traits || ['witty', 'intelligent', 'loyal'],
      empathy_level: config.empathy_level ?? 0.8,
      humor_allowed: config.humor_allowed ?? true,
      formality_level: config.formality_level ?? 0.3,
    };
  }

  /**
   * Get structured tone context for prompt injection.
   *
   * This is the primary method. It produces a concise prompt block
   * that tells the LLM what emotional register to use — without
   * dictating specific words or phrases.
   */
  getToneContext(emotionalContext: EmotionAnalysis, overrideTone?: string[]): ToneContext {
    const tones = overrideTone || this.selectTone(emotionalContext);
    const reasoning = this.buildReasoning(tones, emotionalContext);
    const promptBlock = this.buildPromptBlock(tones, emotionalContext);
    const emotionalSummary = this.summarizeEmotionalContext(emotionalContext);

    return { tones, reasoning, promptBlock, emotionalSummary };
  }

  /**
   * Select appropriate tones based on emotional state.
   *
   * Priority chain: distress > celebration > frustration > anxiety > default
   * Returns max 2 tones to keep prompt guidance focused.
   */
  private selectTone(emotion: EmotionAnalysis): string[] {
    const selectedTones: string[] = [];

    // Priority 1: Someone in distress needs empathy first
    if (emotion.needs_support || emotion.stress_level > 0.7) {
      selectedTones.push('empathetic');

      if (emotion.stress_level > 0.8) {
        // Deep distress — be gentle, don't rush to solutions
        selectedTones.push('gentle');
      } else {
        // Moderate distress — empathy + help them move forward
        selectedTones.push('solution_focused');
      }

      return selectedTones;
    }

    // Priority 2: Match their excitement
    if (emotion.primary_emotion === 'happy' || emotion.primary_emotion === 'excited') {
      selectedTones.push('celebratory');
      return selectedTones;
    }

    // Priority 3: Frustration needs empathy + solutions
    if (emotion.primary_emotion === 'frustrated') {
      selectedTones.push('empathetic');
      selectedTones.push('solution_focused');
      return selectedTones;
    }

    // Priority 4: Anxiety needs gentleness + encouragement
    if (emotion.primary_emotion === 'anxious') {
      selectedTones.push('gentle');
      selectedTones.push('encouraging');
      return selectedTones;
    }

    // Priority 5: Match energy level
    if (emotion.energy_level > 0.7) {
      selectedTones.push('encouraging');
      if (this.config.humor_allowed) {
        selectedTones.push('playful');
      }
    } else if (emotion.energy_level < 0.3) {
      selectedTones.push('gentle');
      selectedTones.push('encouraging');
    } else {
      // Neutral — default warm tone
      selectedTones.push('encouraging');
    }

    // Professional context bumps formality
    if (emotion.context.is_work_related && this.config.formality_level > 0.6) {
      selectedTones.push('professional');
    }

    return selectedTones.slice(0, 2); // Max 2 tones to keep guidance focused
  }

  /**
   * Build a concise prompt block that guides the LLM's tone.
   *
   * KEY PRINCIPLE: We tell the LLM HOW to express itself (the register,
   * the energy, the pacing) — not WHAT to say. The LLM is creative and
   * empathetic by nature. Trust it.
   */
  private buildPromptBlock(tones: string[], emotion: EmotionAnalysis): string {
    const profile1 = TONE_PROFILES[tones[0]];
    const profile2 = tones[1] ? TONE_PROFILES[tones[1]] : null;

    if (!profile1) return ''; // Safety fallback

    const parts: string[] = [];

    // Primary tone guidance — describe the register, don't script it
    parts.push(`Your emotional register right now: ${profile1.description}.`);

    // Secondary tone if present
    if (profile2) {
      parts.push(`Blended with: ${profile2.description}.`);
    }

    // Emotional intensity affects pacing
    if (emotion.intensity > 0.7) {
      parts.push('They\'re feeling something strongly — be present with that before moving forward.');
    } else if (emotion.intensity < 0.3 && emotion.energy_level < 0.3) {
      parts.push('Their energy is low — be warm but not overbearing. Gentle presence.');
    }

    // Specific situational guidance (no canned phrases, just direction)
    if (emotion.needs_support) {
      parts.push('Focus on being present and understanding before offering solutions.');
    }

    if (emotion.stress_level > 0.8) {
      parts.push('Don\'t rush to fix anything. Hold space first.');
    }

    return parts.join(' ');
  }

  /**
   * Build reasoning string for logging/debugging.
   */
  private buildReasoning(tones: string[], emotion: EmotionAnalysis): string {
    const parts: string[] = [];

    if (emotion.needs_support) {
      parts.push('User needs emotional support');
    } else if (emotion.primary_emotion === 'excited' || emotion.primary_emotion === 'happy') {
      parts.push('User is excited — match their energy');
    } else if (emotion.primary_emotion === 'frustrated') {
      parts.push('User is frustrated — empathy then solutions');
    } else if (emotion.stress_level > 0.7) {
      parts.push('User is stressed — gentle and supportive');
    } else {
      parts.push('Maintaining warm, natural tone');
    }

    parts.push(`Selected: ${tones.join(' + ')}`);
    return parts.join('. ');
  }

  // --------------------------------------------------------------------------
  // EMOTIONAL CONTEXT SUMMARY
  // --------------------------------------------------------------------------

  private summarizeEmotionalContext(emotion: EmotionAnalysis): string {
    const parts: string[] = [emotion.primary_emotion];

    if (emotion.intensity > 0.7) parts.push('high_intensity');
    if (emotion.needs_support) parts.push('needs_support');
    if (emotion.stress_level > 0.6) parts.push('stressed');
    if (emotion.energy_level < 0.3) parts.push('low_energy');
    else if (emotion.energy_level > 0.7) parts.push('high_energy');

    return parts.join(', ');
  }

  // --------------------------------------------------------------------------
  // BACKWARD-COMPATIBLE METHODS
  // --------------------------------------------------------------------------

  /**
   * Recommend a tone for logging/analytics purposes.
   */
  recommendTone(emotion: EmotionAnalysis): {
    primary_tone: string;
    secondary_tone: string;
    reasoning: string;
  } {
    const context = this.getToneContext(emotion);
    return {
      primary_tone: context.tones[0] || 'encouraging',
      secondary_tone: context.tones[1] || 'direct',
      reasoning: context.reasoning,
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ToneAdapterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(newConfig: Partial<ToneAdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default ToneAdapter;
