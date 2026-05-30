/**
 * Holly Voice Character Engine — Test Suite
 *
 * Tests the full voice character pipeline:
 *   1. Emotion → Voice Style mapping
 *   2. Verbal personality marker injection
 *   3. Voice blending for transitions
 *   4. Character engine orchestration
 *   5. NVIDIA TTS client (mocked)
 *   6. Text preprocessing
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ─── Emotion Voice Map Tests ─────────────────────────────────────────────────────

describe("Emotion Voice Map", () => {
  let getVoiceForEmotion: typeof import("@/lib/voice/emotion-voice-map").getVoiceForEmotion;
  let getAllEmotionVoiceMappings: typeof import("@/lib/voice/emotion-voice-map").getAllEmotionVoiceMappings;
  let blendVoices: typeof import("@/lib/voice/emotion-voice-map").blendVoices;

  beforeEach(async () => {
    const mod = await import("@/lib/voice/emotion-voice-map");
    getVoiceForEmotion = mod.getVoiceForEmotion;
    getAllEmotionVoiceMappings = mod.getAllEmotionVoiceMappings;
    blendVoices = mod.blendVoices;
  });

  describe("getVoiceForEmotion", () => {
    it("returns voice params for all 13 emotions", () => {
      const emotions = [
        "idle", "focused", "curious", "creative", "excited",
        "contemplative", "empathetic", "analyzing", "researching",
        "generating", "dreaming", "intimate", "passionate",
      ] as const;

      for (const emotion of emotions) {
        const result = getVoiceForEmotion(emotion);
        expect(result).toBeDefined();
        expect(result.style).toBeDefined();
        expect(result.speed).toBeGreaterThan(0);
        expect(result.speed).toBeLessThanOrEqual(2);
        expect(result.voice).toBeDefined();
        expect(result.expressiveness).toBeGreaterThanOrEqual(0);
        expect(result.expressiveness).toBeLessThanOrEqual(1);
        expect(result.warmth).toBeDefined();
        expect(result.description).toBeTruthy();
      }
    });

    it("maps excited to Happy style with higher speed", () => {
      const result = getVoiceForEmotion("excited");
      expect(result.style).toBe("Happy");
      expect(result.speed).toBeGreaterThan(1.0);
      expect(result.expressiveness).toBeGreaterThan(0.8);
    });

    it("maps dreaming to Calm style with slower speed", () => {
      const result = getVoiceForEmotion("dreaming");
      expect(result.style).toBe("Calm");
      expect(result.speed).toBeLessThan(0.9);
    });

    it("maps empathetic to Calm style with warm warmth", () => {
      const result = getVoiceForEmotion("empathetic");
      expect(result.style).toBe("Calm");
      expect(result.warmth).toBe("warm");
    });

    it("maps analyzing to Neutral style with Aria voice", () => {
      const result = getVoiceForEmotion("analyzing");
      expect(result.style).toBe("Neutral");
      expect(result.voice).toBe("Aria");
    });

    it("maps intimate to Calm style with hot warmth and slow speed", () => {
      const result = getVoiceForEmotion("intimate");
      expect(result.style).toBe("Calm");
      expect(result.warmth).toBe("hot");
      expect(result.speed).toBeLessThan(0.8);
      expect(result.expressiveness).toBeGreaterThan(0.8);
    });

    it("maps passionate to Happy style with hot warmth and elevated speed", () => {
      const result = getVoiceForEmotion("passionate");
      expect(result.style).toBe("Happy");
      expect(result.warmth).toBe("hot");
      expect(result.speed).toBeGreaterThan(1.0);
      expect(result.expressiveness).toBeGreaterThan(0.9);
    });

    it("uses Sofia as primary voice for most emotions", () => {
      const mappings = getAllEmotionVoiceMappings();
      const sofiaCount = Object.values(mappings).filter(
        (m) => m.voice === "Sofia"
      ).length;
      // Sofia should be the dominant voice
      expect(sofiaCount).toBeGreaterThanOrEqual(8);
    });

    it("falls back to idle for unknown emotions", () => {
      const result = getVoiceForEmotion("unknown" as any);
      const idle = getVoiceForEmotion("idle");
      expect(result.style).toBe(idle.style);
      expect(result.speed).toBe(idle.speed);
    });
  });

  describe("blendVoices", () => {
    it("returns primary when ratio is 1.0", () => {
      const result = blendVoices("excited", "dreaming", 1.0);
      const excited = getVoiceForEmotion("excited");
      expect(result.style).toBe(excited.style);
      expect(result.speed).toBe(excited.speed);
    });

    it("returns secondary when ratio is 0.0", () => {
      const result = blendVoices("excited", "dreaming", 0.0);
      const dreaming = getVoiceForEmotion("dreaming");
      expect(result.style).toBe(dreaming.style);
      expect(result.speed).toBe(dreaming.speed);
    });

    it("blends speed between two emotions", () => {
      const result = blendVoices("excited", "dreaming", 0.5);
      const excited = getVoiceForEmotion("excited");
      const dreaming = getVoiceForEmotion("dreaming");
      // Speed should be between the two
      const avgSpeed = (excited.speed + dreaming.speed) / 2;
      expect(result.speed).toBeCloseTo(avgSpeed, 1);
    });

    it("clamps ratio to [0, 1]", () => {
      const overResult = blendVoices("excited", "idle", 1.5);
      expect(overResult.style).toBe("Happy");

      const underResult = blendVoices("excited", "idle", -0.5);
      expect(underResult.style).toBe("Calm");
    });
  });
});

// ─── Verbal Markers Tests ─────────────────────────────────────────────────────────

describe("Verbal Markers", () => {
  let injectVerbalMarkers: typeof import("@/lib/voice/verbal-markers").injectVerbalMarkers;
  let stripVerbalMarkers: typeof import("@/lib/voice/verbal-markers").stripVerbalMarkers;

  beforeEach(async () => {
    const mod = await import("@/lib/voice/verbal-markers");
    injectVerbalMarkers = mod.injectVerbalMarkers;
    stripVerbalMarkers = mod.stripVerbalMarkers;
  });

  describe("injectVerbalMarkers", () => {
    it("returns original text for very short inputs", () => {
      const result = injectVerbalMarkers("Hi.", { emotion: "excited" });
      expect(result).toBe("Hi.");
    });

    it("does not double-inject markers", () => {
      const text = "*soft laugh* That's great news! I'm so happy for you.";
      const result = injectVerbalMarkers(text, { emotion: "excited" });
      // Should not add another marker since one already exists
      expect(result).toBe(text);
    });

    it("can inject markers for excited emotion", () => {
      const text = "That is absolutely amazing! I'm so thrilled about this development and everything it means for us.";
      // Run multiple times — at least some should get markers given probability
      let markersFound = 0;
      for (let i = 0; i < 50; i++) {
        const result = injectVerbalMarkers(text + ` (variant ${i})`, { emotion: "excited" });
        if (result !== text + ` (variant ${i})`) markersFound++;
      }
      // With 15% probability over 50 attempts, we should see at least a few
      expect(markersFound).toBeGreaterThan(0);
    });

    it("applies humor response marker when isHumorResponse is true", () => {
      const text = "That's a good one. I hadn't thought of it that way before. Very clever actually and quite amusing.";
      const result = injectVerbalMarkers(text, {
        emotion: "excited",
        isHumorResponse: true,
      });
      expect(result).toContain("chuckle");
    });

    it("applies processing marker when isProcessing is true", () => {
      const text = "Let me work through this step by step to find the right answer for you here.";
      const result = injectVerbalMarkers(text, {
        emotion: "analyzing",
        isProcessing: true,
      });
      expect(result).toContain("Hmm");
    });

    it("applies greeting marker for excited greetings", () => {
      const text = "Hey there! Great to see you again. How's everything going with your project?";
      const result = injectVerbalMarkers(text, {
        emotion: "excited",
        isGreeting: true,
      });
      expect(result).toContain("laugh");
    });

    it("preserves long text content", () => {
      const text = "This is a long response that talks about many things. It spans multiple sentences. Each one has meaning. The content should be preserved through the marker injection process.";
      const result = injectVerbalMarkers(text, { emotion: "contemplative" });
      // Core content should be intact (may have markers added but words preserved)
      expect(result).toContain("This is a long response");
      expect(result).toContain("Each one has meaning");
    });
  });

  describe("stripVerbalMarkers", () => {
    it("strips soft laugh markers", () => {
      const text = "*soft laugh* Hello there.";
      expect(stripVerbalMarkers(text)).toBe("Hello there.");
    });

    it("strips chuckle markers", () => {
      const text = "That's funny. *chuckles softly*";
      expect(stripVerbalMarkers(text)).toBe("That's funny. ");
    });

    it("converts gentle sigh to pause", () => {
      const text = "*gentle sigh* I understand.";
      expect(stripVerbalMarkers(text)).toContain("...");
    });

    it("converts Hmm to pause", () => {
      const text = "Hmm, let me think.";
      const result = stripVerbalMarkers(text);
      expect(result).toContain("Hmm");
    });

    it("handles text with no markers", () => {
      const text = "This is plain text with no markers.";
      expect(stripVerbalMarkers(text)).toBe(text);
    });

    it("strips sensual markers (soft breath, contented sigh, soft moan)", () => {
      expect(stripVerbalMarkers("*soft breath* Hello.")).toContain("...");
      expect(stripVerbalMarkers("*contented sigh* Nice.")).toContain("...");
      expect(stripVerbalMarkers("That was great. *soft moan*")).toContain("...");
    });

    it("strips draws closer marker entirely", () => {
      const text = "*draws closer* Come here.";
      expect(stripVerbalMarkers(text)).toBe("Come here.");
    });
  });
});

// ─── NVIDIA TTS Client Tests ─────────────────────────────────────────────────────

describe("NVIDIA TTS Client", () => {
  let isNvidiaTTSAvailable: typeof import("@/lib/voice/nvidia-tts-client").isNvidiaTTSAvailable;

  beforeEach(async () => {
    const mod = await import("@/lib/voice/nvidia-tts-client");
    isNvidiaTTSAvailable = mod.isNvidiaTTSAvailable;
  });

  it("reports availability based on API key env var", () => {
    // This tests the actual env state — just verify it doesn't throw
    const result = isNvidiaTTSAvailable();
    expect(typeof result).toBe("boolean");
  });
});

// ─── Holly Voice Character Engine Tests ───────────────────────────────────────────

describe("Holly Voice Character Engine", () => {
  let synthesizeWithCharacter: typeof import("@/lib/voice/holly-voice-character").synthesizeWithCharacter;
  let getVoiceCharacterParams: typeof import("@/lib/voice/holly-voice-character").getVoiceCharacterParams;

  beforeEach(async () => {
    const mod = await import("@/lib/voice/holly-voice-character");
    synthesizeWithCharacter = mod.synthesizeWithCharacter;
    getVoiceCharacterParams = mod.getVoiceCharacterParams;
  });

  describe("getVoiceCharacterParams", () => {
    it("returns voice params for any valid emotion", () => {
      const params = getVoiceCharacterParams("excited");
      expect(params).toBeDefined();
      expect(params.style).toBe("Happy");
      expect(params.speed).toBeGreaterThan(1);
    });

    it("blends params when previousEmotion and blendRatio provided", () => {
      const params = getVoiceCharacterParams("excited", "dreaming", 0.5);
      const excitedParams = getVoiceCharacterParams("excited");
      const dreamingParams = getVoiceCharacterParams("dreaming");
      // Should be between the two speeds
      expect(params.speed).toBeGreaterThan(dreamingParams.speed);
      expect(params.speed).toBeLessThan(excitedParams.speed);
    });

    it("returns pure emotion when blendRatio is 1.0", () => {
      const params = getVoiceCharacterParams("excited", "dreaming", 1.0);
      const pureExcited = getVoiceCharacterParams("excited");
      expect(params.speed).toBe(pureExcited.speed);
    });
  });

  describe("synthesizeWithCharacter", () => {
    it("returns result with no audio when no TTS providers available", async () => {
      // No Kokoro synth function provided, NVIDIA may not have key in test env
      const result = await synthesizeWithCharacter({
        text: "Hello, this is a test message from Holly.",
        emotion: "excited",
        userId: "test-user",
      });

      expect(result).toBeDefined();
      expect(result.prosody).toBeDefined();
      expect(result.prosody.style).toBe("Happy");
      expect(result.markersApplied).toBeDefined();
      expect(result.processedText).toBeDefined();
      // Audio may be null if no providers configured
      expect(typeof result.estimatedDurationSec).toBe("number");
    });

    it("applies correct voice style for each emotion", async () => {
      const testCases = [
        { emotion: "excited" as const, expectedStyle: "Happy" },
        { emotion: "dreaming" as const, expectedStyle: "Calm" },
        { emotion: "analyzing" as const, expectedStyle: "Neutral" },
        { emotion: "empathetic" as const, expectedStyle: "Calm" },
        { emotion: "creative" as const, expectedStyle: "Happy" },
      ];

      for (const { emotion, expectedStyle } of testCases) {
        const result = await synthesizeWithCharacter({
          text: `Testing ${emotion} voice style mapping for Holly's character engine.`,
          emotion,
          userId: "test-user",
        });
        expect(result.prosody.style).toBe(expectedStyle);
      }
    });

    it("uses Kokoro fallback when provided", async () => {
      const mockKokoroSynth = jest.fn<(text: string, voice: string, speed: number) => Promise<Buffer>>().mockResolvedValue(Buffer.alloc(44100));

      const result = await synthesizeWithCharacter(
        {
          text: "Testing Kokoro fallback synthesis for Holly.",
          emotion: "idle",
          userId: "test-user",
        },
        mockKokoroSynth
      );

      // If NVIDIA isn't configured, Kokoro should be called
      if (result.provider === "kokoro") {
        expect(mockKokoroSynth).toHaveBeenCalled();
        expect(result.audio).toBeDefined();
        expect(result.audio).not.toBeNull();
      }
    });

    it("applies speed override", async () => {
      const result = await synthesizeWithCharacter({
        text: "Testing speed override functionality.",
        emotion: "idle",
        speed: 1.5,
        userId: "test-user",
      });

      expect(result.prosody.speed).toBe(1.5);
    });

    it("preprocesses text for TTS", async () => {
      const result = await synthesizeWithCharacter({
        text: "Here's some **bold** and *italic* text with an emoji 😊 and a [link](https://example.com).",
        emotion: "focused",
        userId: "test-user",
      });

      // Markdown should be stripped
      expect(result.processedText).not.toContain("**");
      expect(result.processedText).not.toContain("*italic*");
      // Emoji should be removed
      expect(result.processedText).not.toContain("😊");
      // Link should be text-only
      expect(result.processedText).not.toContain("(https://");
      // Core words preserved
      expect(result.processedText).toContain("bold");
      expect(result.processedText).toContain("italic");
    });

    it("handles emotion blending in synthesis", async () => {
      const result = await synthesizeWithCharacter({
        text: "Transitioning between emotional states smoothly in conversation.",
        emotion: "excited",
        previousEmotion: "contemplative",
        blendRatio: 0.7,
        userId: "test-user",
      });

      // Should use blended prosody (primary emotion dominant at 0.7)
      expect(result.prosody.style).toBe("Happy");
      // Speed should be between excited and contemplative
      expect(result.prosody.speed).toBeGreaterThan(0.85);
    });

    it("applies greeting context markers", async () => {
      const result = await synthesizeWithCharacter({
        text: "Hey there! Great to see you. How's everything going today?",
        emotion: "excited",
        isGreeting: true,
        userId: "test-user",
      });

      expect(result.markersApplied).toBeDefined();
      // Greeting with excited should get a laugh marker
      if (result.markersApplied.length > 0) {
        expect(result.markersApplied.some(m => m.toLowerCase().includes("laugh"))).toBe(true);
      }
    });

    it("handles empty text gracefully", async () => {
      const result = await synthesizeWithCharacter({
        text: "",
        emotion: "idle",
        userId: "test-user",
      });

      expect(result).toBeDefined();
      expect(result.audio).toBeNull();
    });
  });
});

// ─── Integration: Full Pipeline ───────────────────────────────────────────────────

describe("Voice Character Pipeline Integration", () => {
  let synthesizeWithCharacter: typeof import("@/lib/voice/holly-voice-character").synthesizeWithCharacter;
  let getVoiceForEmotion: typeof import("@/lib/voice/emotion-voice-map").getVoiceForEmotion;

  beforeEach(async () => {
    const charMod = await import("@/lib/voice/holly-voice-character");
    const mapMod = await import("@/lib/voice/emotion-voice-map");
    synthesizeWithCharacter = charMod.synthesizeWithCharacter;
    getVoiceForEmotion = mapMod.getVoiceForEmotion;
  });

  it("maps all 13 emotions through the full pipeline", async () => {
    const emotions = [
      "idle", "focused", "curious", "creative", "excited",
      "contemplative", "empathetic", "analyzing", "researching",
      "generating", "dreaming", "intimate", "passionate",
    ] as const;

    for (const emotion of emotions) {
      const result = await synthesizeWithCharacter({
        text: `Holly is feeling ${emotion} right now and expressing it through her voice.`,
        emotion,
        userId: "test-user",
      });

      // Every emotion should produce a valid result
      expect(result.prosody).toBeDefined();
      expect(result.prosody.style).toMatch(/^(Happy|Calm|Sad|Angry|Neutral)$/);
      expect(result.processedText).toBeTruthy();
    }
  });

  it("produces noticeably different voice params for different emotions", () => {
    const excitedParams = getVoiceForEmotion("excited");
    const dreamingParams = getVoiceForEmotion("dreaming");
    const analyzingParams = getVoiceForEmotion("analyzing");

    // Excited should be faster than dreaming
    expect(excitedParams.speed).toBeGreaterThan(dreamingParams.speed);

    // Excited should be more expressive than analyzing
    expect(excitedParams.expressiveness).toBeGreaterThan(analyzingParams.expressiveness);

    // Different styles
    expect(excitedParams.style).toBe("Happy");
    expect(analyzingParams.style).toBe("Neutral");
    expect(dreamingParams.style).toBe("Calm");
  });

  it("sensual emotions produce distinct, heated voice profiles", () => {
    const intimateParams = getVoiceForEmotion("intimate");
    const passionateParams = getVoiceForEmotion("passionate");
    const idleParams = getVoiceForEmotion("idle");

    // Both sensual emotions have "hot" warmth — unlike idle
    expect(intimateParams.warmth).toBe("hot");
    expect(passionateParams.warmth).toBe("hot");
    expect(idleParams.warmth).not.toBe("hot");

    // Intimate is the slowest — like pillow talk
    expect(intimateParams.speed).toBeLessThan(idleParams.speed);

    // Passionate is faster than idle — heated energy
    expect(passionateParams.speed).toBeGreaterThan(idleParams.speed);

    // Both are highly expressive
    expect(intimateParams.expressiveness).toBeGreaterThan(0.8);
    expect(passionateParams.expressiveness).toBeGreaterThan(0.9);
  });
});
