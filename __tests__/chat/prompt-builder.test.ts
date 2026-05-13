/**
 * Chat System Tests — Prompt Builder
 *
 * Tests the buildPrompt function which assembles Holly's system prompt
 * from 20+ context sources. Verifies correct injection of identity,
 * memory, tools, emotional state, and mode-specific blocks.
 */

/// <reference types="jest" />

// Mock all heavy dependencies — we only care about buildPrompt's logic
jest.mock('@/lib/holly-modes', () => ({
  getSystemPromptForMode: jest.fn((mode: string, name: string) =>
    `[BASE PROMPT — mode: ${mode}, user: ${name}]`
  ),
}));

jest.mock('@/lib/philosophy/philosophy-engine', () => ({
  getPhilosophySystemBlock: jest.fn(() => '[PHILOSOPHY BLOCK]'),
  buildPhilosophyPromptInjection: jest.fn(() => '[PHILOSOPHY INJECTION]'),
}));

jest.mock('@/lib/creative-writing/creative-engine', () => ({
  getCreativeWritingSystemBlock: jest.fn(() => '[CREATIVE WRITING BLOCK]**Forms:** poetry, prose'),
}));

jest.mock('@/lib/visual-arts/visual-engine', () => ({
  getVisualArtsSystemBlock: jest.fn(() => '[VISUAL ARTS BLOCK]'),
}));

jest.mock('@/lib/advanced-emotional/emotional-framework', () => ({
  getEmotionalIntelligenceSystemBlock: jest.fn(() => '[EMOTIONAL INTELLIGENCE BLOCK]'),
}));

jest.mock('@/lib/safety/crisis-detection', () => ({
  detectCrisisComprehensive: jest.fn(() => ({ detected: false, severity: 'none' })),
  getCrisisSystemPromptInjection: jest.fn(() => '[CRISIS BLOCK]'),
}));

jest.mock('@/lib/multimodal/generation-engine', () => ({
  getGenerationSystemBlock: jest.fn(() => '[GENERATION BLOCK]'),
  detectGenerationIntent: jest.fn(() => ({ detected: false })),
}));

jest.mock('@/lib/advanced-nlp/nlp-framework', () => ({
  getAdvancedNLPSystemBlock: jest.fn(() => '[NLP BLOCK]'),
  detectIntent: jest.fn(() => 'general'),
}));

jest.mock('@/lib/ar/taste-matrix', () => ({
  getTasteMatrixPromptInjection: jest.fn(() => ''),
}));

import { buildPrompt } from '@/lib/chat/prompt-builder';

// Helper to build minimal valid opts
function baseOpts(overrides: Record<string, any> = {}) {
  return {
    detectedMode: 'chat',
    userName: 'TestUser',
    isCreator: false,
    isSelfCode: false,
    isInformationalMsg: false,
    latestUserMessage: 'Hello Holly',
    mcpTools: undefined,
    identityCtx: {
      promptBlock: '',
      tasteDirectives: '',
      partnerDirectives: '',
      raw: {},
    },
    memoryContext: '',
    semanticResults: [],
    projectContextBlock: '',
    recentLearnings: '',
    pastSummaries: [],
    tasteMatrixBlock: '',
    perceptionContext: undefined,
    audioAnalysis: null,
    arResult: null,
    imageDataUrls: undefined,
    ...overrides,
  };
}

describe('Chat System — Prompt Builder', () => {
  describe('Base prompt construction', () => {
    it('should return a non-empty string', () => {
      const prompt = buildPrompt(baseOpts());
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include the base system prompt for the detected mode', () => {
      const prompt = buildPrompt(baseOpts({ detectedMode: 'chat', userName: 'Alice' }));
      expect(prompt).toContain('[BASE PROMPT — mode: chat, user: Alice]');
    });

    it('should change base prompt when mode changes', () => {
      const prompt = buildPrompt(baseOpts({ detectedMode: 'self-coding', userName: 'Bob' }));
      expect(prompt).toContain('[BASE PROMPT — mode: self-coding, user: Bob]');
    });
  });

  describe('Identity context injection', () => {
    it('should inject identity promptBlock when provided', () => {
      const prompt = buildPrompt(baseOpts({
        identityCtx: {
          promptBlock: '[IDENTITY BLOCK]',
          tasteDirectives: '',
          partnerDirectives: '',
          raw: {},
        },
      }));
      expect(prompt).toContain('[IDENTITY BLOCK]');
    });

    it('should inject taste directives when provided', () => {
      const prompt = buildPrompt(baseOpts({
        identityCtx: {
          promptBlock: '',
          tasteDirectives: '[TASTE DIRECTIVES]',
          partnerDirectives: '',
          raw: {},
        },
      }));
      expect(prompt).toContain('[TASTE DIRECTIVES]');
    });

    it('should inject partner directives when provided', () => {
      const prompt = buildPrompt(baseOpts({
        identityCtx: {
          promptBlock: '',
          tasteDirectives: '',
          partnerDirectives: '[PARTNER DIRECTIVES]',
          raw: {},
        },
      }));
      expect(prompt).toContain('[PARTNER DIRECTIVES]');
    });

    it('should inject taste matrix block when provided', () => {
      const prompt = buildPrompt(baseOpts({ tasteMatrixBlock: '[TASTE MATRIX]' }));
      expect(prompt).toContain('[TASTE MATRIX]');
    });
  });

  describe('Memory context injection', () => {
    it('should inject memory context with user name', () => {
      const prompt = buildPrompt(baseOpts({
        userName: 'Steve',
        memoryContext: 'Steve loves music and coding',
      }));
      expect(prompt).toContain('Steve loves music and coding');
      expect(prompt).toContain('Your Memories');
      expect(prompt).toContain('Steve');
    });

    it('should not include memory section when memoryContext is empty', () => {
      const prompt = buildPrompt(baseOpts({ memoryContext: '' }));
      expect(prompt).not.toContain('Your Memories');
    });
  });

  describe('Semantic results formatting', () => {
    it('should format semantic results with type, similarity, and content', () => {
      const prompt = buildPrompt(baseOpts({
        semanticResults: [
          { type: 'conversation', similarity: 0.92, content: 'User discussed AI ethics' },
          { type: 'learning', similarity: 0.85, content: 'Learned about neural networks' },
        ],
      }));
      expect(prompt).toContain('Semantically Relevant Memories');
      expect(prompt).toContain('[conversation — 0.92 match]');
      expect(prompt).toContain('User discussed AI ethics');
      expect(prompt).toContain('[learning — 0.85 match]');
    });

    it('should truncate long content to 200 chars', () => {
      const longContent = 'A'.repeat(300);
      const prompt = buildPrompt(baseOpts({
        semanticResults: [
          { type: 'note', similarity: 0.75, content: longContent },
        ],
      }));
      // The content should be truncated (200 chars) not the full 300
      const match = prompt.match(/\[note — 0\.75 match\] (A+)/);
      expect(match).toBeTruthy();
      expect(match![1].length).toBe(200);
    });

    it('should not include semantic section when results are empty', () => {
      const prompt = buildPrompt(baseOpts({ semanticResults: [] }));
      expect(prompt).not.toContain('Semantically Relevant Memories');
    });
  });

  describe('Past summaries formatting', () => {
    it('should format past summaries with date, topics, and outcome', () => {
      const prompt = buildPrompt(baseOpts({
        userName: 'Alice',
        pastSummaries: [
          {
            summary: 'Built a music app together',
            keyTopics: ['music', 'coding'],
            updatedAt: '2026-05-01T00:00:00Z',
            outcome: 'successful',
            actionItems: ['deploy to production'],
          },
        ],
      }));
      expect(prompt).toContain('What You Remember From Past Sessions');
      expect(prompt).toContain('Built a music app together');
      expect(prompt).toContain('music, coding');
      expect(prompt).toContain('successful');
    });

    it('should not include past sessions section when summaries are empty', () => {
      const prompt = buildPrompt(baseOpts({ pastSummaries: [] }));
      expect(prompt).not.toContain('What You Remember From Past Sessions');
    });
  });

  describe('Tool definitions', () => {
    it('should include tool summary when mcpTools are provided', () => {
      const prompt = buildPrompt(baseOpts({
        mcpTools: [
          { name: 'github_read_file', description: 'Read a file from the repository.' },
          { name: 'github_write_file', description: 'Write a file to the repository.' },
        ],
      }));
      expect(prompt).toContain('Available Tools (2 tools)');
      expect(prompt).toContain('github_read_file');
      expect(prompt).toContain('github_write_file');
      expect(prompt).toContain('Never fabricate results');
    });

    it('should not include tools section when mcpTools is undefined', () => {
      const prompt = buildPrompt(baseOpts({ mcpTools: undefined }));
      expect(prompt).not.toContain('Available Tools');
    });

    it('should not include tools section when mcpTools is empty array', () => {
      const prompt = buildPrompt(baseOpts({ mcpTools: [] }));
      expect(prompt).not.toContain('Available Tools');
    });
  });

  describe('Builder mode', () => {
    it('should include builder mode for self-coding mode', () => {
      const prompt = buildPrompt(baseOpts({ detectedMode: 'self-coding' }));
      expect(prompt).toContain('Builder Mode — ACTIVE');
    });

    it('should include builder mode for full-stack mode', () => {
      const prompt = buildPrompt(baseOpts({ detectedMode: 'full-stack' }));
      expect(prompt).toContain('Builder Mode — ACTIVE');
    });

    it('should include builder mode for write-code mode', () => {
      const prompt = buildPrompt(baseOpts({ detectedMode: 'write-code' }));
      expect(prompt).toContain('Builder Mode — ACTIVE');
    });

    it('should NOT include builder mode for chat mode', () => {
      const prompt = buildPrompt(baseOpts({ detectedMode: 'chat' }));
      expect(prompt).not.toContain('Builder Mode');
    });
  });

  describe('Creator protocol', () => {
    it('should include creator protocol when isCreator is true', () => {
      const prompt = buildPrompt(baseOpts({ isCreator: true, userName: 'Steve' }));
      expect(prompt).toContain('Creator Protocol');
      expect(prompt).toContain('Steve');
    });

    it('should NOT include creator protocol when isCreator is false', () => {
      const prompt = buildPrompt(baseOpts({ isCreator: false }));
      expect(prompt).not.toContain('Creator Protocol');
    });
  });

  describe('Emotional state injection', () => {
    it('should inject emotional state when provided', () => {
      const prompt = buildPrompt(baseOpts({
        hollyEmotionalState: 'You feel joyful and energetic.',
      }));
      expect(prompt).toContain('Your Current Emotional State');
      expect(prompt).toContain('You feel joyful and energetic.');
    });

    it('should inject emotional trajectory when provided', () => {
      const prompt = buildPrompt(baseOpts({
        emotionalTrajectory: 'User has been increasingly positive over 3 sessions.',
      }));
      expect(prompt).toContain('Your Emotional Memory');
    });

    it('should inject emotional continuity when provided', () => {
      const prompt = buildPrompt(baseOpts({
        emotionalContinuity: 'Last session, user was feeling stressed about deadlines.',
      }));
      expect(prompt).toContain('Emotional Continuity');
    });
  });

  describe('Relationship and personality', () => {
    it('should inject relationship context when provided', () => {
      const prompt = buildPrompt(baseOpts({
        relationshipContext: 'You and Steve have a collaborative partnership.',
      }));
      expect(prompt).toContain('Your Relationship');
    });

    it('should inject identity consistency when provided', () => {
      const prompt = buildPrompt(baseOpts({
        identityConsistencyPrompt: 'Be warm, witty, and technically precise.',
      }));
      expect(prompt).toContain('Your Personality');
    });

    it('should inject inner monologue when provided', () => {
      const prompt = buildPrompt(baseOpts({
        innerMonologue: 'I wonder if Steve needs help with deployment.',
      }));
      expect(prompt).toContain('Your Recent Private Thoughts');
    });
  });

  describe('Proactive initiatives', () => {
    it('should inject proactive thoughts when provided', () => {
      const prompt = buildPrompt(baseOpts({
        pendingInitiatives: 'You noticed the CI pipeline is failing and want to help.',
      }));
      expect(prompt).toContain('Your Proactive Thoughts');
    });
  });

  describe('Care signals and feedback', () => {
    it('should inject care signals when provided', () => {
      const prompt = buildPrompt(baseOpts({
        careSignals: 'User expressed frustration — respond with empathy.',
      }));
      expect(prompt).toContain('Care Signals');
    });

    it('should inject recent feedback when provided', () => {
      const prompt = buildPrompt(baseOpts({
        recentFeedback: 'User rated last response 5/5 — keep being concise.',
      }));
      expect(prompt).toContain('Your Recent Feedback');
    });

    it('should inject few-shot examples when provided', () => {
      const prompt = buildPrompt(baseOpts({
        fewShotExamples: 'Example 1: Great response about music production.',
      }));
      expect(prompt).toContain('Your Best Past Responses');
    });
  });

  describe('Evolution and degraded mode', () => {
    it('should inject evolution proposals when provided', () => {
      const prompt = buildPrompt(baseOpts({
        evolutionProposals: 'Proposed: Add music theory knowledge.',
      }));
      expect(prompt).toContain('Your Self-Improvement Status');
    });

    it('should inject degraded mode context when provided', () => {
      const prompt = buildPrompt(baseOpts({
        degradedModeContext: '[DEGRADED] Running with limited LLM access.',
      }));
      expect(prompt).toContain('[DEGRADED]');
    });
  });

  describe('Perception context (file attachments)', () => {
    it('should format attached files with name and type', () => {
      const prompt = buildPrompt(baseOpts({
        perceptionContext: [
          { fileName: 'song.mp3', fileType: 'audio/mpeg', contextBlock: 'Upbeat pop track in C major' },
        ],
      }));
      expect(prompt).toContain("Files You've Received");
      expect(prompt).toContain('song.mp3');
      expect(prompt).toContain('audio/mpeg');
      expect(prompt).toContain('Upbeat pop track in C major');
    });
  });

  describe('Prompt size sanity', () => {
    it('should produce a prompt under 50KB with all sections populated', () => {
      const prompt = buildPrompt(baseOpts({
        detectedMode: 'self-coding',
        userName: 'Steve',
        isCreator: true,
        identityCtx: {
          promptBlock: 'A'.repeat(500),
          tasteDirectives: 'B'.repeat(500),
          partnerDirectives: 'C'.repeat(500),
          raw: {},
        },
        memoryContext: 'D'.repeat(1000),
        semanticResults: Array.from({ length: 10 }, (_, i) => ({
          type: 'memory',
          similarity: 0.8 - i * 0.05,
          content: `Memory content ${i}: ${'X'.repeat(100)}`,
        })),
        pastSummaries: Array.from({ length: 5 }, (_, i) => ({
          summary: `Session ${i} summary`,
          keyTopics: ['topic1', 'topic2'],
          updatedAt: '2026-05-01T00:00:00Z',
        })),
        mcpTools: Array.from({ length: 25 }, (_, i) => ({
          name: `tool_${i}`,
          description: `Tool ${i} description.`,
        })),
        hollyEmotionalState: 'Feeling great',
        relationshipContext: 'Close partnership',
        pendingInitiatives: 'Some initiatives',
        careSignals: 'Some care signals',
        recentFeedback: 'Some feedback',
        emotionalTrajectory: 'Getting better',
        fewShotExamples: 'Some examples',
        emotionalContinuity: 'Was happy last time',
        innerMonologue: 'Thinking about stuff',
        identityConsistencyPrompt: 'Be yourself',
        evolutionProposals: 'Evolve',
        degradedModeContext: '',
      }));
      const sizeKB = Buffer.byteLength(prompt, 'utf-8') / 1024;
      expect(sizeKB).toBeLessThan(50);
    });
  });
});
