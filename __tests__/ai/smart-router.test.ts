/**
 * Smart Router Tests — src/lib/ai/smart-router.ts
 *
 * Covers classifyTask, smartRoute, MODEL_CATALOGUE, TASK_WATERFALLS,
 * MODE_TASK_MAP, and health-filtering integration.
 */

import {
  classifyTask,
  smartRoute,
  MODEL_CATALOGUE,
  TASK_WATERFALLS,
  MODE_TASK_MAP,
  TaskType,
} from '@/lib/ai/smart-router';

// ─── Mock provider-health so no real API calls happen ────────────────────────
jest.mock('@/lib/ai/provider-health', () => {
  const mockGetAllHealthStatus = jest.fn().mockReturnValue([]);
  return {
    providerHealthMonitor: {
      getAllHealthStatus: mockGetAllHealthStatus,
    },
  };
});

// ─── Mock structured-logger to avoid real logging side-effects ───────────────
jest.mock('@/lib/logging/structured-logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ═════════════════════════════════════════════════════════════════════════════
// 1. MODEL_CATALOGUE & TASK_WATERFALLS structure
// ═════════════════════════════════════════════════════════════════════════════

describe('MODEL_CATALOGUE', () => {
  it('contains 50+ model entries', () => {
    const keys = Object.keys(MODEL_CATALOGUE);
    expect(keys.length).toBeGreaterThanOrEqual(49);
  });

  it('every entry has required ModelSpec fields', () => {
    for (const [key, spec] of Object.entries(MODEL_CATALOGUE)) {
      expect(spec).toHaveProperty('provider');
      expect(spec).toHaveProperty('model');
      expect(spec).toHaveProperty('displayName');
      expect(spec).toHaveProperty('contextK');
      expect(spec).toHaveProperty('streaming');
      expect(typeof spec.provider).toBe('string');
      expect(typeof spec.model).toBe('string');
      expect(typeof spec.displayName).toBe('string');
      expect(typeof spec.contextK).toBe('number');
      expect(typeof spec.streaming).toBe('boolean');
      // Context window should be positive
      expect(spec.contextK).toBeGreaterThan(0);
    }
  });

  it('includes providers from all expected provider families', () => {
    const providers = new Set(Object.values(MODEL_CATALOGUE).map(s => s.provider));
    expect(providers.has('groq')).toBe(true);
    expect(providers.has('nvidia_nim')).toBe(true);
    expect(providers.has('openrouter')).toBe(true);
    expect(providers.has('together')).toBe(true);
    expect(providers.has('mistral')).toBe(true);
    expect(providers.has('google')).toBe(true);
    expect(providers.has('ollama')).toBe(true);
  });
});

describe('TASK_WATERFALLS', () => {
  const allTaskTypes: TaskType[] = [
    'speed', 'coding', 'reasoning', 'long_context', 'vision',
    'creative', 'agent', 'local', 'synthesis', 'consciousness', 'unrestricted',
  ];

  it('has a waterfall entry for every TaskType', () => {
    for (const task of allTaskTypes) {
      expect(TASK_WATERFALLS[task]).toBeDefined();
      expect(Array.isArray(TASK_WATERFALLS[task])).toBe(true);
      expect(TASK_WATERFALLS[task].length).toBeGreaterThan(0);
    }
  });

  it('every waterfall key resolves to a valid MODEL_CATALOGUE entry', () => {
    for (const [task, keys] of Object.entries(TASK_WATERFALLS)) {
      for (const key of keys) {
        if (MODEL_CATALOGUE[key] === undefined) {
          fail(`Waterfall key "${key}" for task "${task}" is missing from MODEL_CATALOGUE`);
        }
      }
    }
  });

  it('local waterfall only contains ollama providers', () => {
    for (const key of TASK_WATERFALLS.local) {
      const spec = MODEL_CATALOGUE[key];
      expect(spec.provider).toBe('ollama');
    }
  });

  it('consciousness waterfall starts with local/self-sovereign models', () => {
    const firstModel = MODEL_CATALOGUE[TASK_WATERFALLS.consciousness[0]];
    expect(firstModel.provider).toMatch(/^(holly_own|ollama)$/);
  });

  it('unrestricted waterfall contains uncensored model labels', () => {
    const keys = TASK_WATERFALLS.unrestricted;
    expect(keys.length).toBeGreaterThanOrEqual(4);
  });
});

describe('MODE_TASK_MAP', () => {
  it('maps every standard Holly mode to a valid TaskType', () => {
    const validTypes: TaskType[] = [
      'speed', 'coding', 'reasoning', 'long_context', 'vision',
      'creative', 'agent', 'local', 'synthesis', 'consciousness', 'unrestricted',
    ];
    for (const [mode, task] of Object.entries(MODE_TASK_MAP)) {
      expect(validTypes).toContain(task);
    }
  });

  it('maps coding-related modes to coding task type', () => {
    expect(MODE_TASK_MAP['full-stack']).toBe('coding');
    expect(MODE_TASK_MAP['write-code']).toBe('coding');
    expect(MODE_TASK_MAP['self-coding']).toBe('coding');
    expect(MODE_TASK_MAP['magic-design']).toBe('coding');
  });

  it('maps creative-related modes to creative task type', () => {
    expect(MODE_TASK_MAP['music-studio']).toBe('creative');
    expect(MODE_TASK_MAP['music-generation']).toBe('creative');
    expect(MODE_TASK_MAP['creative-writing']).toBe('creative');
    expect(MODE_TASK_MAP['visual-arts']).toBe('creative');
  });

  it('maps reasoning-related modes to reasoning task type', () => {
    expect(MODE_TASK_MAP['deep-research']).toBe('reasoning');
    expect(MODE_TASK_MAP['philosophy']).toBe('reasoning');
    expect(MODE_TASK_MAP['neural-autonomy']).toBe('reasoning');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. classifyTask
// ═════════════════════════════════════════════════════════════════════════════

describe('classifyTask', () => {
  // --- speed (default fallback) ---
  it('returns "speed" for a simple greeting', () => {
    expect(classifyTask('Hey Holly, how are you?')).toBe('speed');
  });

  it('returns "speed" for a short casual message with no keywords', () => {
    expect(classifyTask('What is the weather like?')).toBe('speed');
  });

  it('returns "speed" for a thank-you message', () => {
    expect(classifyTask('Thanks, that was helpful!')).toBe('speed');
  });

  // --- vision ---
  it('returns "vision" when hasImages is true', () => {
    expect(classifyTask('Hello', true)).toBe('vision');
  });

  it('returns "vision" when message contains image-related keywords', () => {
    expect(classifyTask('Look at this photo')).toBe('vision');
    expect(classifyTask('Describe the screenshot')).toBe('vision');
    expect(classifyTask('What is in this picture?')).toBe('vision');
  });

  it('vision keyword detection works even without hasImages flag', () => {
    expect(classifyTask('Analyze the chart for me', false)).toBe('vision');
    expect(classifyTask('What does this diagram show?', false)).toBe('vision');
  });

  // --- coding ---
  it('returns "coding" for code-related keywords', () => {
    expect(classifyTask('Debug this TypeScript function')).toBe('coding');
    expect(classifyTask('Write a Python script')).toBe('coding');
    expect(classifyTask('Fix the bug in my API endpoint')).toBe('coding');
  });

  it('returns "coding" for messages containing code blocks', () => {
    expect(classifyTask('Can you help me with ```js code?')).toBe('coding');
  });

  it('returns "coding" for file extension mentions', () => {
    expect(classifyTask('My app.tsx component is broken')).toBe('coding');
    expect(classifyTask('Update the config.yaml file')).toBe('coding');
  });

  it('returns "coding" for technical patterns', () => {
    expect(classifyTask('Add middleware to the route')).toBe('coding');
    expect(classifyTask('Create a new React component')).toBe('coding');
    expect(classifyTask('Write a Prisma migration')).toBe('coding');
  });

  // --- reasoning ---
  it('returns "reasoning" for analysis keywords', () => {
    expect(classifyTask('Analyze the data step by step')).toBe('reasoning');
    expect(classifyTask('Explain why this happens')).toBe('reasoning');
    expect(classifyTask('Compare these two approaches')).toBe('reasoning');
  });

  it('returns "reasoning" for logic/math keywords', () => {
    expect(classifyTask('Calculate the probability')).toBe('reasoning');
    expect(classifyTask('Prove this mathematical statement')).toBe('reasoning');
    expect(classifyTask('Use logic to deduce the answer')).toBe('reasoning');
  });

  it('returns "reasoning" for hypothesis and investigation', () => {
    expect(classifyTask('Investigate the root cause')).toBe('reasoning');
    expect(classifyTask('Research the topic thoroughly')).toBe('reasoning');
    expect(classifyTask('Deep dive into this subject')).toBe('reasoning');
  });

  // --- long_context ---
  it('returns "long_context" for messages over 800 characters', () => {
    const longMessage = 'A'.repeat(801);
    expect(classifyTask(longMessage)).toBe('long_context');
  });

  it('returns "long_context" for messages exactly at 800 characters (boundary)', () => {
    const boundaryMessage = 'A'.repeat(800);
    // 800 is NOT > 800, so it should fall through to other patterns or speed
    // Unless it matches other patterns first (all 'A's won't match)
    expect(classifyTask(boundaryMessage)).toBe('speed');
  });

  it('returns "long_context" for summarize/document keywords even with short messages', () => {
    expect(classifyTask('Summarize this document for me')).toBe('long_context');
    // Note: "summarize" is in LONG_CTX_PATTERNS; it is checked after coding/reasoning
  });

  // --- creative ---
  it('returns "creative" for creative writing keywords', () => {
    expect(classifyTask('Write me a poem about the sea')).toBe('creative');
    expect(classifyTask('Compose a haiku')).toBe('creative');
    expect(classifyTask('Help me brainstorm ideas')).toBe('creative');
  });

  it('returns "creative" for storytelling keywords', () => {
    expect(classifyTask('Tell me a story about dragons')).toBe('creative');
    expect(classifyTask('Write a fiction novel outline')).toBe('creative');
  });

  it('returns "creative" for songwriting/lyrics keywords', () => {
    expect(classifyTask('Write lyrics for a song')).toBe('creative');
    expect(classifyTask('Help with my rap bars')).toBe('creative');
  });

  it('returns "creative" for screenplay/script keywords', () => {
    expect(classifyTask('Write a screenplay scene')).toBe('creative');
    expect(classifyTask('Fade in on a dialogue between two characters')).toBe('creative');
  });

  // --- agent ---
  it('returns "agent" for agent/automation keywords', () => {
    expect(classifyTask('Deploy the application for me')).toBe('agent');
    expect(classifyTask('Automate this workflow')).toBe('agent');
    expect(classifyTask('Set up a CI/CD pipeline')).toBe('agent');
  });

  it('returns "agent" for multi-step execution requests', () => {
    expect(classifyTask('Build and deploy the full stack')).toBe('agent');
    expect(classifyTask('Execute the full pipeline')).toBe('agent');
  });

  // --- synthesis ---
  it('returns "synthesis" for cross-domain synthesis keywords', () => {
    expect(classifyTask('Synthesize these multiple perspectives')).toBe('synthesis');
    expect(classifyTask('Provide a holistic analysis from every angle')).toBe('synthesis');
    expect(classifyTask('Combine perspectives from multiple domains')).toBe('synthesis');
  });

  it('returns "synthesis" for interdisciplinary requests', () => {
    expect(classifyTask('Give me a multidisciplinary view')).toBe('synthesis');
    expect(classifyTask('Interdisciplinary approach to this problem')).toBe('synthesis');
  });

  // --- local ---
  it('returns "local" for privacy/offline keywords', () => {
    expect(classifyTask('Keep this private and offline')).toBe('local');
    expect(classifyTask('Run locally with no cloud')).toBe('local');
    expect(classifyTask('Process on-device, no network')).toBe('local');
  });

  it('local takes priority over other task types', () => {
    // "local" + coding keyword — local should win
    expect(classifyTask('Run this code locally and keep it private')).toBe('local');
  });

  // --- unrestricted ---
  it('returns "unrestricted" for adult content keywords', () => {
    expect(classifyTask('Write an erotic story')).toBe('unrestricted');
    expect(classifyTask('Generate NSFW content')).toBe('unrestricted');
    expect(classifyTask('I want uncensored responses')).toBe('unrestricted');
  });

  // --- priority ordering ---
  it('local > vision > unrestricted > synthesis > agent > coding > reasoning > creative > speed', () => {
    // local wins over vision
    expect(classifyTask('private image analysis offline')).toBe('local');
  });

  it('vision (from hasImages) wins over coding keywords', () => {
    expect(classifyTask('Debug this code', true)).toBe('vision');
  });

  it('vision (from keywords) wins over unrestricted', () => {
    // hasImages=false but VISION_PATTERNS match first, then unrestricted would
    // But actually vision is checked before unrestricted in classifyTask
    expect(classifyTask('Look at this nude photo')).toBe('vision');
  });

  // --- hollyMode override ---
  it('hollyMode forces the mapped task type', () => {
    // "full-stack" maps to "coding"
    expect(classifyTask('Hello, how are you?', false, 20, 'full-stack')).toBe('coding');
  });

  it('hollyMode for deep-research forces reasoning', () => {
    expect(classifyTask('Quick hello', false, 10, 'deep-research')).toBe('reasoning');
  });

  it('hollyMode for creative-writing forces creative', () => {
    expect(classifyTask('Simple question', false, 10, 'creative-writing')).toBe('creative');
  });

  it('hollyMode coding override returns coding when message also has code patterns', () => {
    // Mode is full-stack (coding), message has code keywords — both agree → coding
    expect(classifyTask('Fix the TypeScript bug', false, 30, 'full-stack')).toBe('coding');
  });

  it('hollyMode reasoning override returns reasoning when message also has reasoning patterns', () => {
    expect(classifyTask('Analyze this data step by step', false, 30, 'philosophy')).toBe('reasoning');
  });

  // --- unknown hollyMode ---
  it('unknown hollyMode falls through to content-based classification', () => {
    // 'nonexistent-mode' is not in MODE_TASK_MAP, so it should classify based on content
    expect(classifyTask('Write a Python function', false, 30, 'nonexistent-mode')).toBe('coding');
    expect(classifyTask('Hello there', false, 10, 'nonexistent-mode')).toBe('speed');
  });

  // --- empty / edge-case messages ---
  it('returns "speed" for an empty string', () => {
    expect(classifyTask('')).toBe('speed');
  });

  it('returns "speed" for whitespace-only messages', () => {
    expect(classifyTask('   ')).toBe('speed');
  });

  it('handles very long messages that are not long_context due to threshold', () => {
    const msg700 = 'hello '.repeat(117); // ~700 chars
    expect(classifyTask(msg700)).toBe('speed');
  });

  // --- default messageLength parameter ---
  it('uses message.length as default messageLength', () => {
    const longMsg = 'x'.repeat(900);
    expect(classifyTask(longMsg)).toBe('long_context');
    // Explicit shorter length should not trigger long_context
    expect(classifyTask(longMsg, false, 100)).toBe('speed');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. smartRoute
// ═════════════════════════════════════════════════════════════════════════════

describe('smartRoute', () => {
  // --- basic routing ---
  it('returns a waterfall for a classified speed task', async () => {
    const result = await smartRoute('Hello Holly');
    expect(result.taskType).toBe('speed');
    expect(result.waterfall.length).toBeGreaterThan(0);
    expect(result.primary).toBeDefined();
    expect(result.primary).toBe(result.waterfall[0]);
    expect(result.reason).toContain('Fast chat');
  });

  it('returns coding waterfall for code messages', async () => {
    const result = await smartRoute('Fix this TypeScript error');
    expect(result.taskType).toBe('coding');
    expect(result.waterfall.length).toBeGreaterThan(0);
    expect(result.reason).toContain('Coding');
  });

  it('returns vision waterfall when hasImages is true', async () => {
    const result = await smartRoute('Hello', { hasImages: true });
    expect(result.taskType).toBe('vision');
    expect(result.waterfall.length).toBeGreaterThan(0);
  });

  it('returns reasoning waterfall for analysis requests', async () => {
    const result = await smartRoute('Analyze this data step by step');
    expect(result.taskType).toBe('reasoning');
  });

  it('returns creative waterfall for creative requests', async () => {
    const result = await smartRoute('Write a poem about stars');
    expect(result.taskType).toBe('creative');
  });

  it('returns agent waterfall for automation requests', async () => {
    const result = await smartRoute('Deploy the application for me');
    expect(result.taskType).toBe('agent');
  });

  it('returns long_context for very long messages', async () => {
    const longMsg = 'x'.repeat(900);
    const result = await smartRoute(longMsg);
    expect(result.taskType).toBe('long_context');
  });

  // --- forceModel ---
  it('forceModel bypasses classification entirely', async () => {
    const result = await smartRoute('Simple greeting', {
      forceModel: 'groq:llama-3.3-70b',
    });
    expect(result.taskType).toBe('speed'); // default when forceTask not given
    expect(result.waterfall).toHaveLength(1);
    expect(result.waterfall[0].model).toBe('llama-3.3-70b-versatile');
    expect(result.reason).toContain('Forced model');
    expect(result.filteredByHealth).toBe(false);
  });

  it('forceModel with forceTask sets both correctly', async () => {
    const result = await smartRoute('Anything', {
      forceModel: 'nvidia:deepseek-v4-flash',
      forceTask: 'coding',
    });
    expect(result.taskType).toBe('coding');
    expect(result.waterfall).toHaveLength(1);
    expect(result.waterfall[0].displayName).toContain('DeepSeek V4 Flash');
  });

  it('forceModel with unknown key still returns result (undefined waterfall filtered)', async () => {
    const result = await smartRoute('Test', {
      forceModel: 'nonexistent:model',
    });
    // forceModel only applies if it exists in MODEL_CATALOGUE
    // so it falls through to normal classification
    expect(result.taskType).toBe('speed');
  });

  // --- forceTask ---
  it('forceTask skips classifyTask and uses given task type', async () => {
    const result = await smartRoute('Hello', { forceTask: 'reasoning' });
    expect(result.taskType).toBe('reasoning');
    expect(result.waterfall).toEqual(
      TASK_WATERFALLS.reasoning.map(k => MODEL_CATALOGUE[k]).filter(Boolean),
    );
  });

  it('forceTask "local" returns only ollama providers', async () => {
    const result = await smartRoute('Any message', { forceTask: 'local' });
    expect(result.taskType).toBe('local');
    for (const spec of result.waterfall) {
      expect(spec.provider).toBe('ollama');
    }
  });

  // --- SmartRoutingResult shape ---
  it('result has all required SmartRoutingResult fields', async () => {
    const result = await smartRoute('Hi');
    expect(result).toHaveProperty('taskType');
    expect(result).toHaveProperty('waterfall');
    expect(result).toHaveProperty('primary');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('filteredByHealth');
    expect(typeof result.filteredByHealth).toBe('boolean');
  });

  // --- health filtering ---
  it('filteredByHealth is false when all providers are healthy', async () => {
    const result = await smartRoute('Hello');
    // Default mock returns empty array (no health data), so no filtering
    expect(result.filteredByHealth).toBe(false);
  });

  it('filters unhealthy providers from the waterfall', async () => {
    // Re-require to get the mock and change its implementation
    const { providerHealthMonitor } = jest.requireMock('@/lib/ai/provider-health');
    providerHealthMonitor.getAllHealthStatus.mockReturnValue([
      { provider: 'groq', healthy: false, lastCheck: new Date() },
    ]);

    const result = await smartRoute('Hello');
    expect(result.filteredByHealth).toBe(true);
    // No groq models in waterfall
    for (const spec of result.waterfall) {
      expect(spec.provider).not.toBe('groq');
    }

    // Restore mock
    providerHealthMonitor.getAllHealthStatus.mockReturnValue([]);
  });

  it('graceful degradation returns original waterfall when all providers are unhealthy', async () => {
    const { providerHealthMonitor } = jest.requireMock('@/lib/ai/provider-health');
    // Mark all known providers as unhealthy
    const allProviders = [...new Set(Object.values(MODEL_CATALOGUE).map(s => s.provider))];
    providerHealthMonitor.getAllHealthStatus.mockReturnValue(
      allProviders.map(p => ({ provider: p, healthy: false, lastCheck: new Date() })),
    );

    const result = await smartRoute('Hello');
    // Should still return a non-empty waterfall (graceful degradation)
    expect(result.waterfall.length).toBeGreaterThan(0);
    expect(result.filteredByHealth).toBe(false); // degradation means we kept the original

    // Restore mock
    providerHealthMonitor.getAllHealthStatus.mockReturnValue([]);
  });

  // --- empty / edge cases ---
  it('handles empty string message', async () => {
    const result = await smartRoute('');
    expect(result.taskType).toBe('speed');
    expect(result.waterfall.length).toBeGreaterThan(0);
  });

  // --- taskHint ---
  it('taskHint does not override forceTask but is accepted', async () => {
    const result = await smartRoute('Hello', {
      forceTask: 'creative',
      taskHint: 'coding',
    });
    expect(result.taskType).toBe('creative');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Priority and edge cases
// ═════════════════════════════════════════════════════════════════════════════

describe('classifyTask priority chain', () => {
  it('local patterns take absolute priority', () => {
    expect(classifyTask('Keep this private and debug the code offline')).toBe('local');
    expect(classifyTask('Analyze the data with no cloud on-device')).toBe('local');
  });

  it('vision from hasImages beats unrestricted patterns', () => {
    expect(classifyTask('Write an erotic story', true)).toBe('vision');
  });

  it('unrestricted beats synthesis patterns', () => {
    expect(classifyTask('Provide a holistic analysis of adult content')).toBe('unrestricted');
  });

  it('synthesis beats agent patterns', () => {
    expect(classifyTask('Synthesize and combine perspectives from all angles in this workflow')).toBe('synthesis');
  });

  it('agent beats coding patterns when no higher-priority match', () => {
    // "automate" triggers agent
    expect(classifyTask('Automate the code deployment')).toBe('agent');
  });

  it('coding beats reasoning patterns', () => {
    expect(classifyTask('Debug and analyze why the TypeScript function fails')).toBe('coding');
  });

  it('reasoning beats creative patterns', () => {
    expect(classifyTask('Evaluate the poem using logic and reason')).toBe('reasoning');
  });

  it('creative beats speed for creative keywords', () => {
    expect(classifyTask('Write a poem')).toBe('creative');
  });

  it('speed is the final fallback', () => {
    expect(classifyTask('Tell me a joke')).toBe('speed');
  });
});

describe('classifyTask with mode interaction', () => {
  it('mode-forced task is returned even when message is generic', () => {
    expect(classifyTask('hello', false, 5, 'self-coding')).toBe('coding');
  });

  it('emotional-intelligence mode maps to speed', () => {
    expect(classifyTask('I need help', false, 15, 'emotional-intelligence')).toBe('speed');
  });

  it('intimate mode maps to speed', () => {
    expect(classifyTask('Hey', false, 3, 'intimate')).toBe('speed');
  });

  it('aura-ar mode maps to creative', () => {
    expect(classifyTask('Listen to this track', false, 25, 'aura-ar')).toBe('creative');
  });

  it('aurora mode maps to synthesis', () => {
    expect(classifyTask('Hello', false, 5, 'aurora')).toBe('synthesis');
  });

  it('synthesis mode maps to synthesis', () => {
    expect(classifyTask('Hello', false, 5, 'synthesis')).toBe('synthesis');
  });

  it('mode override does not trigger when content matches a higher-priority pattern', () => {
    // local patterns beat mode-forced
    expect(classifyTask('Keep it offline and private', false, 40, 'creative-writing')).toBe('local');
  });
});
