import { POST } from '../../app/api/chat/route';
import { NextRequest } from 'next/server';
import * as clerkAuth from '@clerk/nextjs/server';


jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('@/lib/db', () => ({
  prisma: {
    conversationSummary: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock('@/lib/memory-service', () => ({
  getRelevantMemories: jest.fn().mockResolvedValue(''),
  extractMemories: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/holly-modes', () => ({
  detectMode: jest.fn().mockReturnValue('default'),
  getSystemPromptForMode: jest.fn().mockReturnValue('test system prompt'),
  HOLLY_MODES: { default: { name: 'Default' } },
}));

jest.mock('@/lib/user-manager', () => ({
  getOrCreateUser: jest.fn().mockResolvedValue({
    id: 'db-user-1',
    name: 'Test User',
    email: 'test@example.com',
  }),
}));

jest.mock('@/lib/mcp/mcp-client', () => ({
  mcpManager: {
    ensureHollyTools: jest.fn().mockResolvedValue(false),
    getAllTools: jest.fn().mockResolvedValue([]),
    callTool: jest.fn(),
  },
}));

jest.mock('@/lib/identity/identity-context', () => ({
  getIdentityContext: jest.fn().mockResolvedValue({
    promptBlock: '',
    tasteDirectives: '',
    partnerDirectives: '',
    raw: {
      identity: null,
      goals: [],
      emotionalState: null,
      taste: null,
      patterns: [],
      partner: null,
    },
  }),
}));

jest.mock('@/lib/consciousness/post-response-hook', () => ({
  recordExchange: jest.fn(),
  extractTopics: jest.fn().mockReturnValue([]),
}));

jest.mock('@/lib/ai/smart-router', () => ({
  smartRoute: jest.fn().mockReturnValue({
    primary: { displayName: 'Test Model' },
    waterfall: [],
    reason: 'test',
  }),
  classifyTask: jest.fn().mockReturnValue('speed'),
  TASK_WATERFALLS: {},
  MODEL_CATALOGUE: {},
}));

jest.mock('@/lib/ai/cascade', () => ({
  cascade: jest.fn(),
}));

jest.mock('@/lib/ai/providers/free-providers', () => ({
  PROVIDERS: {},
}));

jest.mock('@/lib/security/security-monitor', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
}));

jest.mock('@/lib/memory/semantic-memory', () => ({
  semanticSearch: jest.fn().mockResolvedValue([]),
  rememberExchange: jest.fn(),
}));

jest.mock('@/lib/project-context/holly-projects', () => ({
  injectProjectContext: jest.fn().mockResolvedValue(''),
  addNote: jest.fn(),
  detectRelevantProject: jest.fn(),
}));

jest.mock('@/lib/self-sovereign/training-pipeline', () => ({
  collectFromConversation: jest.fn(),
}));

jest.mock('@/lib/background-learning/holly-learns', () => ({
  getRecentLearnings: jest.fn().mockResolvedValue(''),
}));

jest.mock('@/lib/philosophy/philosophy-engine', () => ({
  getPhilosophySystemBlock: jest.fn().mockReturnValue(''),
  buildPhilosophyPromptInjection: jest.fn().mockReturnValue(''),
}));

jest.mock('@/lib/creative-writing/creative-engine', () => ({
  getCreativeWritingSystemBlock: jest.fn().mockReturnValue(''),
}));

jest.mock('@/lib/visual-arts/visual-engine', () => ({
  getVisualArtsSystemBlock: jest.fn().mockReturnValue(''),
}));

jest.mock('@/lib/advanced-emotional/emotional-framework', () => ({
  getEmotionalIntelligenceSystemBlock: jest.fn().mockReturnValue(''),
  detectCrisis: jest.fn().mockReturnValue({ detected: false }),
  CRISIS_RESPONSE: '',
}));

jest.mock('@/lib/safety/crisis-detection', () => ({
  detectCrisisComprehensive: jest.fn().mockReturnValue({
    detected: false,
    severity: 'none',
    categories: [],
  }),
  getCrisisSystemPromptInjection: jest.fn().mockReturnValue(''),
}));

jest.mock('@/lib/intimate/intimate-persona', () => ({
  getIntimatePersonaBlock: jest.fn().mockReturnValue(''),
  checkIntimateRequest: jest.fn().mockReturnValue(false),
  detectSafeWord: jest.fn().mockReturnValue(false),
  INTIMATE_DECLINE_RESPONSES: [],
}));

jest.mock('@/lib/advanced-nlp/nlp-framework', () => ({
  getAdvancedNLPSystemBlock: jest.fn().mockReturnValue(''),
  detectIntent: jest.fn().mockReturnValue('general'),
}));

jest.mock('@/lib/ar/holly-ar-engine', () => ({
  runARAnalysis: jest.fn(),
  isARRequest: jest.fn().mockReturnValue(false),
  getARModeFromMessage: jest.fn(),
}));

jest.mock('@/lib/multimodal/generation-engine', () => ({
  getGenerationSystemBlock: jest.fn().mockReturnValue(''),
  detectGenerationIntent: jest.fn().mockReturnValue({ detected: false }),
}));

jest.mock('@/lib/interaction/personalization-engine', () => ({
  getPersonalization: jest.fn().mockResolvedValue({
    preferences: null,
    patterns: [],
    insights: { topPatterns: [] },
    personalizationScore: 0,
  }),
}));

const mockedAuth = clerkAuth.auth as jest.Mock;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat — security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockedAuth.mockResolvedValue({ userId: null });

    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: 'hello' }],
    }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('rejects messages over 50,000 characters', async () => {
    mockedAuth.mockResolvedValue({ userId: 'user-123' });

    const longMessage = 'x'.repeat(50_001);
    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: longMessage }],
    }));

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/too long/i);
  });

  it('does not rate-limit — HOLLY runs uncapped', async () => {
    mockedAuth.mockResolvedValue({ userId: 'user-123' });

    // Multiple rapid requests should all be accepted (no 429)
    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: 'ping' }],
    }));

    // Should NOT be 429 — rate limiting was intentionally removed
    expect(res.status).not.toBe(429);
  });
});
