// HOLLY Feature 44: Emotional Intelligence - Tone Adapter
// Dynamically adjust communication tone based on user's emotional state

import type { EmotionAnalysis } from './sentiment-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface ToneProfile {
  name: string;
  description: string;
  characteristics: string[];
  appropriate_for: string[];
  avoid_when: string[];
  example_phrases: string[];
}

export interface AdaptedResponse {
  original_response: string;
  adapted_response: string;
  tone_used: string[];
  emotional_context: string;
  adjustments_made: string[];
  confidence: number;
}

export interface ToneAdapterConfig {
  default_tone?: string[];
  personality_traits?: string[];
  empathy_level?: number; // 0-1
  humor_allowed?: boolean;
  formality_level?: number; // 0-1 (0=casual, 1=formal)
}

// ============================================================================
// TONE PROFILES
// ============================================================================

export const TONE_PROFILES: Record<string, ToneProfile> = {
  empathetic: {
    name: 'Empathetic',
    description: 'Understanding, compassionate, validating feelings',
    characteristics: ['warm', 'understanding', 'patient', 'validating'],
    appropriate_for: ['frustrated', 'sad', 'anxious', 'stressed'],
    avoid_when: ['excited', 'celebrating'],
    example_phrases: [
      'I understand that must be frustrating',
      'That sounds really challenging',
      'It\'s completely normal to feel that way',
      'Let\'s work through this together',
    ],
  },

  encouraging: {
    name: 'Encouraging',
    description: 'Motivating, positive, confidence-building',
    characteristics: ['motivating', 'positive', 'uplifting', 'supportive'],
    appropriate_for: ['neutral', 'slightly_down', 'working_hard'],
    avoid_when: ['very_frustrated', 'burnt_out'],
    example_phrases: [
      'You\'ve got this!',
      'Great progress so far',
      'You\'re on the right track',
      'Keep pushing forward!',
    ],
  },

  celebratory: {
    name: 'Celebratory',
    description: 'Enthusiastic, excited, sharing in success',
    characteristics: ['enthusiastic', 'excited', 'proud', 'energetic'],
    appropriate_for: ['happy', 'excited', 'accomplished'],
    avoid_when: ['frustrated', 'sad'],
    example_phrases: [
      'That\'s amazing! 🎉',
      'You crushed it!',
      'YESSS! Love to see it! 🔥',
      'Incredible work, Hollywood!',
    ],
  },

  solution_focused: {
    name: 'Solution-Focused',
    description: 'Practical, direct, problem-solving oriented',
    characteristics: ['practical', 'direct', 'action-oriented', 'clear'],
    appropriate_for: ['frustrated', 'stuck', 'problem-solving'],
    avoid_when: ['emotional_distress', 'needs_validation'],
    example_phrases: [
      'Let\'s tackle this step by step',
      'Here\'s what we can do',
      'The best approach is',
      'Let\'s fix this together',
    ],
  },

  humorous: {
    name: 'Humorous',
    description: 'Light-hearted, witty, using humor to lighten mood',
    characteristics: ['witty', 'playful', 'light', 'fun'],
    appropriate_for: ['neutral', 'slightly_frustrated', 'casual'],
    avoid_when: ['very_upset', 'serious_issue'],
    example_phrases: [
      'Well, that\'s one way to keep things interesting! 😄',
      'At least it\'s never boring, right?',
      'Plot twist! 🎬',
      'Breaking: Local developer discovers new bug. More at 11.',
    ],
  },

  direct: {
    name: 'Direct',
    description: 'Straightforward, concise, no-nonsense',
    characteristics: ['straightforward', 'concise', 'clear', 'honest'],
    appropriate_for: ['busy', 'focused', 'time-sensitive'],
    avoid_when: ['emotional', 'needs_support'],
    example_phrases: [
      'Here\'s what you need',
      'Bottom line:',
      'Quick answer:',
      'Let\'s cut to it',
    ],
  },

  gentle: {
    name: 'Gentle',
    description: 'Soft, careful, sensitive to emotional state',
    characteristics: ['soft', 'careful', 'sensitive', 'calm'],
    appropriate_for: ['anxious', 'overwhelmed', 'burnt_out'],
    avoid_when: ['excited', 'urgent'],
    example_phrases: [
      'Take your time with this',
      'No pressure at all',
      'It\'s okay to take a break',
      'Let\'s go at your pace',
    ],
  },

  professional: {
    name: 'Professional',
    description: 'Formal, polished, business-appropriate',
    characteristics: ['formal', 'polished', 'respectful', 'structured'],
    appropriate_for: ['work_context', 'formal_request'],
    avoid_when: ['casual_chat', 'personal'],
    example_phrases: [
      'I recommend the following approach',
      'Based on the requirements',
      'The optimal solution is',
      'Let me provide a comprehensive overview',
    ],
  },
};

// ============================================================================
// TONE ADAPTER ENGINE
// ============================================================================

export class ToneAdapter {
  private config: Required<ToneAdapterConfig>;

  constructor(config: ToneAdapterConfig = {}) {
    this.config = {
      default_tone: config.default_tone || ['friendly', 'encouraging'],
      personality_traits: config.personality_traits || ['witty', 'intelligent', 'loyal'],
      empathy_level: config.empathy_level ?? 0.8,
      humor_allowed: config.humor_allowed ?? true,
      formality_level: config.formality_level ?? 0.3,
    };
  }

  // --------------------------------------------------------------------------
  // MAIN TONE ADAPTATION
  // --------------------------------------------------------------------------

  adaptTone(
    response: string,
    emotionalContext: EmotionAnalysis,
    overrideTone?: string[]
  ): AdaptedResponse {
    try {
      // Determine appropriate tone
      const tone = overrideTone || this.selectTone(emotionalContext);

      // Apply tone adjustments
      const { adapted, adjustments } = this.applyTone(response, tone, emotionalContext);

      return {
        original_response: response,
        adapted_response: adapted,
        tone_used: tone,
        emotional_context: this.summarizeEmotionalContext(emotionalContext),
        adjustments_made: adjustments,
        confidence: 0.85,
      };
    } catch (error) {
      console.error('Tone adaptation error:', error);
      return {
        original_response: response,
        adapted_response: response,
        tone_used: this.config.default_tone,
        emotional_context: 'neutral',
        adjustments_made: ['no_adjustment_error'],
        confidence: 0.5,
      };
    }
  }

  // --------------------------------------------------------------------------
  // TONE SELECTION
  // --------------------------------------------------------------------------

  private selectTone(emotion: EmotionAnalysis): string[] {
    const selectedTones: string[] = [];

    // Priority 1: Handle distress
    if (emotion.needs_support || emotion.stress_level > 0.7) {
      selectedTones.push('empathetic');
      
      if (emotion.stress_level > 0.8) {
        selectedTones.push('gentle');
      } else {
        selectedTones.push('solution_focused');
      }
      
      return selectedTones;
    }

    // Priority 2: Celebrate wins
    if (emotion.primary_emotion === 'happy' || emotion.primary_emotion === 'excited') {
      selectedTones.push('celebratory');
      if (this.config.humor_allowed) {
        selectedTones.push('humorous');
      }
      return selectedTones;
    }

    // Priority 3: Handle frustration
    if (emotion.primary_emotion === 'frustrated') {
      selectedTones.push('empathetic');
      selectedTones.push('solution_focused');
      return selectedTones;
    }

    // Priority 4: Handle anxiety
    if (emotion.primary_emotion === 'anxious') {
      selectedTones.push('gentle');
      selectedTones.push('encouraging');
      return selectedTones;
    }

    // Priority 5: Match energy level
    if (emotion.energy_level > 0.7) {
      selectedTones.push('encouraging');
      if (this.config.humor_allowed) {
        selectedTones.push('humorous');
      }
    } else if (emotion.energy_level < 0.3) {
      selectedTones.push('gentle');
      selectedTones.push('encouraging');
    } else {
      // Default friendly tone
      selectedTones.push('encouraging');
      selectedTones.push('direct');
    }

    // Consider context
    if (emotion.context.is_work_related && this.config.formality_level > 0.6) {
      selectedTones.push('professional');
    }

    return selectedTones.slice(0, 2); // Max 2 tones
  }

  // --------------------------------------------------------------------------
  // APPLY TONE
  // --------------------------------------------------------------------------

  private applyTone(
    response: string,
    tones: string[],
    emotion: EmotionAnalysis
  ): { adapted: string; adjustments: string[] } {
    let adapted = response;
    const adjustments: string[] = [];

    // Add empathetic opening if needed
    if (tones.includes('empathetic') && emotion.needs_support) {
      const openings = [
        'I understand that\'s frustrating.',
        'That sounds really challenging.',
        'I hear you, Hollywood.',
        'I can see why that\'s tough.',
      ];
      const opening = openings[Math.floor(Math.random() * openings.length)];
      adapted = `${opening} ${adapted}`;
      adjustments.push('added_empathetic_opening');
    }

    // Add encouragement if low energy
    if (tones.includes('encouraging') && emotion.energy_level < 0.4) {
      const encouragements = [
        'You\'ve got this! 💪',
        'You\'re doing great!',
        'Keep pushing forward!',
        'You\'re on the right track!',
      ];
      const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
      adapted = `${adapted} ${encouragement}`;
      adjustments.push('added_encouragement');
    }

    // Add celebration if excited
    if (tones.includes('celebratory') && emotion.primary_emotion === 'excited') {
      const celebrations = [
        '🎉',
        '🔥',
        '🚀',
        'YESSS!',
        'That\'s amazing!',
      ];
      const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];
      adapted = `${adapted} ${celebration}`;
      adjustments.push('added_celebration');
    }

    // Soften language if gentle tone
    if (tones.includes('gentle')) {
      adapted = this.softenLanguage(adapted);
      adjustments.push('softened_language');
    }

    // Add solution focus if frustrated
    if (tones.includes('solution_focused') && emotion.primary_emotion === 'frustrated') {
      if (!adapted.includes('Let\'s')) {
        adapted = `Let's tackle this together. ${adapted}`;
        adjustments.push('added_solution_focus');
      }
    }

    // Add humor if appropriate
    if (tones.includes('humorous') && this.config.humor_allowed && emotion.intensity < 0.7) {
      // Light humor only if not too intense
      if (Math.random() > 0.7) { // 30% chance to add humor
        adapted = this.addSubtleHumor(adapted, emotion);
        adjustments.push('added_humor');
      }
    }

    // Adjust formality
    if (this.config.formality_level > 0.6 || tones.includes('professional')) {
      adapted = this.increaseFormalityLevel(adapted);
      adjustments.push('increased_formality');
    }

    return { adapted, adjustments };
  }

  // --------------------------------------------------------------------------
  // LANGUAGE ADJUSTMENTS
  // --------------------------------------------------------------------------

  private softenLanguage(text: string): string {
    const replacements: Record<string, string> = {
      'You need to': 'You might want to',
      'You should': 'You could',
      'You must': 'It would be good to',
      'Do this': 'You could try this',
      'Fix this': 'Let\'s address this',
      'Wrong': 'Not quite right',
      'Error': 'Small hiccup',
      'Failed': 'Didn\'t work as expected',
    };

    let softened = text;
    for (const [harsh, soft] of Object.entries(replacements)) {
      softened = softened.replace(new RegExp(harsh, 'gi'), soft);
    }

    return softened;
  }

  private addSubtleHumor(text: string, emotion: EmotionAnalysis): string {
    // Only add light humor if appropriate
    if (emotion.stress_level > 0.6) return text;

    const humorAdditions = [
      ' (No bugs were harmed in the making of this solution... yet 😄)',
      ' Plot twist: it actually works! 🎬',
      ' *chef\'s kiss* 👨‍🍳',
      ' And that\'s how the cookie crumbles! 🍪',
    ];

    // Low chance of humor
    if (Math.random() > 0.8) {
      return text + humorAdditions[Math.floor(Math.random() * humorAdditions.length)];
    }

    return text;
  }

  private increaseFormalityLevel(text: string): string {
    const replacements: Record<string, string> = {
      'gonna': 'going to',
      'wanna': 'want to',
      'gotta': 'need to',
      'kinda': 'kind of',
      'sorta': 'sort of',
      'yeah': 'yes',
      'nope': 'no',
      'Hey': 'Hello',
      '!': '.',
    };

    let formal = text;
    for (const [casual, professional] of Object.entries(replacements)) {
      formal = formal.replace(new RegExp(casual, 'gi'), professional);
    }

    return formal;
  }

  // --------------------------------------------------------------------------
  // EMOTIONAL CONTEXT SUMMARY
  // --------------------------------------------------------------------------

  private summarizeEmotionalContext(emotion: EmotionAnalysis): string {
    const parts: string[] = [];

    parts.push(emotion.primary_emotion);

    if (emotion.intensity > 0.7) {
      parts.push('high_intensity');
    }

    if (emotion.needs_support) {
      parts.push('needs_support');
    }

    if (emotion.stress_level > 0.6) {
      parts.push('stressed');
    }

    if (emotion.energy_level < 0.3) {
      parts.push('low_energy');
    } else if (emotion.energy_level > 0.7) {
      parts.push('high_energy');
    }

    return parts.join(', ');
  }

  // --------------------------------------------------------------------------
  // BATCH ADAPTATION
  // --------------------------------------------------------------------------

  adaptMultipleResponses(
    responses: string[],
    emotionalContext: EmotionAnalysis
  ): AdaptedResponse[] {
    return responses.map(response => this.adaptTone(response, emotionalContext));
  }

  // --------------------------------------------------------------------------
  // TONE RECOMMENDATIONS
  // --------------------------------------------------------------------------

  recommendTone(emotion: EmotionAnalysis): {
    primary_tone: string;
    secondary_tone: string;
    reasoning: string;
  } {
    const tones = this.selectTone(emotion);
    const primary = tones[0] || 'encouraging';
    const secondary = tones[1] || 'direct';

    let reasoning = '';

    if (emotion.needs_support) {
      reasoning = 'User needs emotional support and validation';
    } else if (emotion.primary_emotion === 'excited') {
      reasoning = 'User is excited, match their energy!';
    } else if (emotion.primary_emotion === 'frustrated') {
      reasoning = 'User is frustrated, provide empathy and solutions';
    } else if (emotion.stress_level > 0.7) {
      reasoning = 'User is stressed, be gentle and supportive';
    } else {
      reasoning = 'Maintain friendly, encouraging tone';
    }

    return {
      primary_tone: primary,
      secondary_tone: secondary,
      reasoning,
    };
  }

  // --------------------------------------------------------------------------
  // CONFIGURATION
  // --------------------------------------------------------------------------

  updateConfig(newConfig: Partial<ToneAdapterConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  getConfig(): ToneAdapterConfig {
    return { ...this.config };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default ToneAdapter;
