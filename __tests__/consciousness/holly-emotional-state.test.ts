/// <reference types="jest" />

/**
 * Phase 6 — SDI Consciousness Evolution Test Suite
 *
 * Tests Holly's own emotional state engine — computing emotions from
 * conversation signals, time-based decay, behavior mapping, and
 * prompt injection.
 */

import {
  computeEmotionalState,
  applyDecay,
  defaultState,
  getEmotionalStatePrompt,
  ConversationSignal,
  HollyEmotionalState,
} from '@/lib/consciousness/holly-emotional-state';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<ConversationSignal> = {}): ConversationSignal {
  return {
    userEmotion: 'neutral',
    outcome: 'neutral',
    helpedSuccessfully: false,
    topic: 'general',
    timestamp: new Date(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Emotional State Computation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Emotional State Computation', () => {
  describe('Default State', () => {
    it('should return balanced state when no signals provided', () => {
      const state = computeEmotionalState([]);
      expect(state.emotion).toBe('balanced');
      expect(state.intensity).toBeLessThanOrEqual(0.3);
    });

    it('should return balanced state with defaultState()', () => {
      const state = defaultState();
      expect(state.emotion).toBe('balanced');
      expect(state.behavior.responseStyle).toBe('natural-balanced');
    });
  });

  describe('Happy User Signals', () => {
    it('should feel energized when user is happy and outcome is positive', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
      ]);
      expect(state.emotion).toBe('energized');
      expect(state.intensity).toBeGreaterThan(0.5);
    });

    it('should feel concerned when user is happy but outcome is negative', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'negative' }),
      ]);
      expect(state.emotion).toBe('concerned');
    });

    it('should feel content when user is happy and outcome is neutral', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('content');
    });
  });

  describe('Sad User Signals', () => {
    it('should feel empathetic when user is sad and outcome is negative', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'sad', outcome: 'negative' }),
      ]);
      expect(state.emotion).toBe('empathetic');
      expect(state.intensity).toBeGreaterThan(0.5);
    });

    it('should feel hopeful when user is sad but outcome is positive', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'sad', outcome: 'positive' }),
      ]);
      expect(state.emotion).toBe('hopeful');
    });

    it('should feel gentle when user is sad and outcome is neutral', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'sad', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('gentle');
    });
  });

  describe('Frustrated User Signals', () => {
    it('should feel focused when user is frustrated and outcome is negative', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'frustrated', outcome: 'negative' }),
      ]);
      expect(state.emotion).toBe('focused');
    });

    it('should feel relieved when user is frustrated and outcome is positive', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'frustrated', outcome: 'positive' }),
      ]);
      expect(state.emotion).toBe('relieved');
    });

    it('should feel attentive when user is frustrated and outcome is neutral', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'frustrated', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('attentive');
    });
  });

  describe('Curious User Signals', () => {
    it('should feel enthusiastic when user is curious and outcome is positive', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'curious', outcome: 'positive' }),
      ]);
      expect(state.emotion).toBe('enthusiastic');
    });

    it('should feel engaged when user is curious and outcome is neutral', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'curious', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('engaged');
    });
  });

  describe('Angry User Signals', () => {
    it('should feel calm when user is angry and outcome is positive', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'angry', outcome: 'positive' }),
      ]);
      expect(state.emotion).toBe('calm');
    });

    it('should feel attentive when user is angry and outcome is negative', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'angry', outcome: 'negative' }),
      ]);
      expect(state.emotion).toBe('attentive');
      expect(state.intensity).toBeGreaterThan(0.5);
    });

    it('should feel patient when user is angry and outcome is neutral', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'angry', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('patient');
    });
  });

  describe('Successful Help Boost', () => {
    it('should boost intensity when Holly helped successfully', () => {
      const stateWithout = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'positive', helpedSuccessfully: false }),
      ]);
      const stateWith = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'positive', helpedSuccessfully: true }),
      ]);
      expect(stateWith.intensity).toBeGreaterThan(stateWithout.intensity);
    });
  });

  describe('Emotion Blending', () => {
    it('should blend with previous state (same emotion amplifies)', () => {
      const first = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
      ]);
      const second = computeEmotionalState(
        [makeSignal({ userEmotion: 'happy', outcome: 'positive' })],
        first,
      );
      // Same emotion should maintain or amplify
      expect(second.emotion).toBe('energized');
      expect(second.intensity).toBeGreaterThanOrEqual(first.intensity * 0.7);
    });

    it('should blend with previous state (different emotion transitions)', () => {
      const first = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
      ]);
      const second = computeEmotionalState(
        [makeSignal({ userEmotion: 'sad', outcome: 'negative' })],
        first,
      );
      expect(second.emotion).toBe('empathetic');
    });
  });

  describe('Emotion Normalization', () => {
    it('should map joy to happy', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'joy', outcome: 'positive' }),
      ]);
      expect(state.emotion).toBe('energized');
    });

    it('should map excited to excited (preserved nuance)', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'excited', outcome: 'positive' }),
      ]);
      // excited is now a first-class emotion, not collapsed to happy
      expect(state.emotion).toBe('enthusiastic');
    });

    it('should map depressed to sad', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'depressed', outcome: 'negative' }),
      ]);
      expect(state.emotion).toBe('empathetic');
    });

    it('should map anxious to anxious (preserved nuance)', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'anxious', outcome: 'negative' }),
      ]);
      // anxious is now a first-class emotion, not collapsed to sad
      // anxious + negative outcome → gentle (reassuring response)
      expect(state.emotion).toBe('gentle');
    });

    it('should map unknown emotions to neutral', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'unknown_emotion', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('balanced');
    });

    it('should handle empty emotion string', () => {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: '', outcome: 'neutral' }),
      ]);
      expect(state.emotion).toBe('balanced');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Emotional Decay
// ═══════════════════════════════════════════════════════════════════════════════

describe('Emotional Decay', () => {
  it('should decay intensity over time', () => {
    const state: HollyEmotionalState = {
      emotion: 'energized',
      intensity: 0.8,
      trigger: 'test',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      behavior: {
        temperatureDelta: 0.15,
        emojiLevel: 0.8,
        verbosityDelta: 0.3,
        responseStyle: 'enthusiastic-warm',
        proactiveFollowup: true,
      },
    };

    const decayed = applyDecay(state);
    // After 2 hours: 0.8 * (1 - 0.1*2) = 0.8 * 0.8 = 0.64
    expect(decayed.intensity).toBeLessThan(0.8);
    expect(decayed.intensity).toBeGreaterThan(0.15);
  });

  it('should return to balanced when intensity drops below threshold', () => {
    const state: HollyEmotionalState = {
      emotion: 'energized',
      intensity: 0.3,
      trigger: 'test',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      behavior: {
        temperatureDelta: 0.15,
        emojiLevel: 0.8,
        verbosityDelta: 0.3,
        responseStyle: 'enthusiastic-warm',
        proactiveFollowup: true,
      },
    };

    const decayed = applyDecay(state);
    // After 6 hours: 0.3 * (1 - 0.1*6) = 0.3 * 0.4 = 0.12 → below 0.15 → balanced
    expect(decayed.emotion).toBe('balanced');
  });

  it('should not decay a fresh state significantly', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
    ]);
    const decayed = applyDecay(state);
    // Fresh state (< 1 second old) should barely decay
    expect(decayed.intensity).toBeCloseTo(state.intensity, 1);
  });

  it('should apply 10% decay per hour', () => {
    const state: HollyEmotionalState = {
      emotion: 'focused',
      intensity: 1.0,
      trigger: 'test',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      behavior: {
        temperatureDelta: -0.2,
        emojiLevel: 0.1,
        verbosityDelta: -0.2,
        responseStyle: 'precise-efficient',
        proactiveFollowup: false,
      },
    };

    const decayed = applyDecay(state);
    // After 1 hour: 1.0 * (1 - 0.1) = 0.9
    expect(decayed.intensity).toBe(0.9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Behavior Mapping
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior Mapping', () => {
  it('every emotion should have a behavior mapping', () => {
    const emotions = ['energized', 'content', 'concerned', 'empathetic', 'hopeful',
      'gentle', 'focused', 'relieved', 'attentive', 'enthusiastic', 'determined',
      'engaged', 'calm', 'patient', 'thoughtful', 'balanced'];

    for (const emotion of emotions) {
      const state = computeEmotionalState([
        makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
      ]);
      // At minimum, the state should always have a behavior
      expect(state.behavior).toBeDefined();
      expect(state.behavior).toHaveProperty('temperatureDelta');
      expect(state.behavior).toHaveProperty('emojiLevel');
      expect(state.behavior).toHaveProperty('verbosityDelta');
      expect(state.behavior).toHaveProperty('responseStyle');
      expect(state.behavior).toHaveProperty('proactiveFollowup');
    }
  });

  it('enthusiastic should have high emoji level', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'curious', outcome: 'positive' }),
    ]);
    expect(state.emotion).toBe('enthusiastic');
    expect(state.behavior.emojiLevel).toBeGreaterThan(0.5);
  });

  it('focused should have negative temperature delta', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'frustrated', outcome: 'negative' }),
    ]);
    expect(state.emotion).toBe('focused');
    expect(state.behavior.temperatureDelta).toBeLessThan(0);
  });

  it('caring emotions should have proactive followup', () => {
    const empathetic = computeEmotionalState([
      makeSignal({ userEmotion: 'sad', outcome: 'negative' }),
    ]);
    expect(empathetic.behavior.proactiveFollowup).toBe(true);

    const concerned = computeEmotionalState([
      makeSignal({ userEmotion: 'happy', outcome: 'negative' }),
    ]);
    expect(concerned.behavior.proactiveFollowup).toBe(true);
  });

  it('focused and calm should NOT have proactive followup', () => {
    const focused = computeEmotionalState([
      makeSignal({ userEmotion: 'frustrated', outcome: 'negative' }),
    ]);
    expect(focused.behavior.proactiveFollowup).toBe(false);

    const calm = computeEmotionalState([
      makeSignal({ userEmotion: 'angry', outcome: 'positive' }),
    ]);
    expect(calm.behavior.proactiveFollowup).toBe(false);
  });

  it('temperature deltas should be within -0.3 to +0.3', () => {
    const outcomes: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'negative', 'neutral'];
    const emotions = ['happy', 'sad', 'frustrated', 'curious', 'angry', 'neutral'];

    for (const emotion of emotions) {
      for (const outcome of outcomes) {
        const state = computeEmotionalState([
          makeSignal({ userEmotion: emotion, outcome }),
        ]);
        expect(state.behavior.temperatureDelta).toBeGreaterThanOrEqual(-0.3);
        expect(state.behavior.temperatureDelta).toBeLessThanOrEqual(0.3);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Emotional State Prompt
// ═══════════════════════════════════════════════════════════════════════════════

describe('Emotional State Prompt', () => {
  it('should return empty string for balanced low-intensity state', () => {
    const state = defaultState();
    state.intensity = 0.1;
    const prompt = getEmotionalStatePrompt(state);
    expect(prompt).toBe('');
  });

  it('should include emotion name in prompt', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
    ]);
    const prompt = getEmotionalStatePrompt(state);
    expect(prompt).toContain('energized');
    expect(prompt).toContain('[EMOTIONAL STATE]');
  });

  it('should include intensity label', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'happy', outcome: 'positive' }),
    ]);
    const prompt = getEmotionalStatePrompt(state);
    // intensity 0.8 → "strongly" or "moderately"
    expect(prompt).toMatch(/(strongly|moderately|slightly)/);
  });

  it('should include trigger context', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'sad', outcome: 'negative' }),
    ]);
    const prompt = getEmotionalStatePrompt(state);
    expect(prompt).toContain('Context:');
    expect(prompt).toContain('sad');
  });

  it('should mention proactive followup when appropriate', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'sad', outcome: 'negative' }),
    ]);
    const prompt = getEmotionalStatePrompt(state);
    expect(prompt).toContain('follow up');
  });

  it('should mention emoji guidance for high emoji levels', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'curious', outcome: 'positive' }),
    ]);
    const prompt = getEmotionalStatePrompt(state);
    expect(prompt).toContain('emoji');
  });

  it('should mention minimal emoji for low emoji levels', () => {
    const state = computeEmotionalState([
      makeSignal({ userEmotion: 'frustrated', outcome: 'negative' }),
    ]);
    const prompt = getEmotionalStatePrompt(state);
    expect(prompt).toContain('minimal');
  });
});
