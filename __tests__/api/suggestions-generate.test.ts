/**
 * C4 — Suggestion engine endpoint tests.
 * Mocks auth, prisma, and the LLM cascade; verifies ownership checks,
 * honest-empty behavior, and normalization of LLM output.
 */
import { POST } from '../../app/api/suggestions/generate/route';


jest.mock('@/lib/chat/auth', () => ({
  authenticateAndLoadUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    conversation: { findUnique: jest.fn() },
    relationshipMemory: { findMany: jest.fn().mockResolvedValue([]) },
    userExtension: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/ai/smart-router', () => ({
  smartRoute: jest.fn().mockResolvedValue({ waterfall: [{ provider: 'mock' }] }),
}));

jest.mock('@/lib/ai/cascade', () => ({
  cascadeCollect: jest.fn(),
}));


import { prisma } from '@/lib/db';
import { cascadeCollect } from '@/lib/ai/cascade';
import { authenticateAndLoadUser } from '@/lib/chat/auth';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/suggestions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockAuthed(dbUserId: string) {
  (authenticateAndLoadUser as jest.Mock).mockResolvedValue({
    userId: 'clerk_123',
    dbUserId,
    userName: 'User',
    userEmail: 'user@example.com',
    isCreator: false,
  });
}

const MESSAGES = [
  { role: 'user', content: 'Hey Holly, how are you today?' },
  { role: 'assistant', content: 'I am doing wonderfully. How is your project going?' },
  { role: 'user', content: 'It is going well, almost done with the launch.' },
];

describe('POST /api/suggestions/generate (C4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.relationshipMemory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userExtension.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    (authenticateAndLoadUser as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ conversationId: 'c1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when conversationId is missing', async () => {
    mockAuthed('dbu1');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 for a conversation owned by someone else', async () => {
    mockAuthed('dbu1');
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      userId: 'dbu-other',
      title: null,
      messages: [],
    });
    const res = await POST(makeRequest({ conversationId: 'c1' }));
    expect(res.status).toBe(404);
  });

  it('returns empty suggestions honestly when fewer than 2 messages exist', async () => {
    mockAuthed('dbu1');
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      userId: 'dbu1',
      title: null,
      messages: [{ role: 'user', content: 'hi' }],
    });
    const res = await POST(makeRequest({ conversationId: 'c1' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
    expect(data.contextUsed).toBe(1);
    expect(cascadeCollect).not.toHaveBeenCalled();
  });

  it('normalizes a valid LLM JSON array into suggestions', async () => {
    mockAuthed('dbu1');
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      userId: 'dbu1',
      title: 'Launch talk',
      messages: MESSAGES,
    });
    (prisma.relationshipMemory.findMany as jest.Mock).mockResolvedValue([
      { key: 'building_startup', content: 'User is launching a company' },
    ]);
    (prisma.userExtension.findMany as jest.Mock).mockResolvedValue([
      { extensionId: 'music-production' },
    ]);
    (cascadeCollect as jest.Mock).mockResolvedValue({
      text: '[{"type":"question","text":"What is left before launch?","icon":"help-circle","relevanceScore":0.9},{"type":"action","text":"Help me plan the launch day","icon":"zap","relevanceScore":0.8},{"type":"bogus","text":"","icon":"x","relevanceScore":5}]',
    });

    const res = await POST(makeRequest({ conversationId: 'c1', messageCount: 5 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    // The third item (empty text) is dropped by normalization
    expect(data.suggestions).toHaveLength(2);
    expect(data.suggestions[0]).toMatchObject({
      type: 'question',
      text: 'What is left before launch?',
      icon: 'help-circle',
      action: 'send_message',
      relevanceScore: 0.9,
    });
    expect(data.contextUsed).toBe(3);

    // Prompt includes real memory + extension context
    const prompt = (cascadeCollect as jest.Mock).mock.calls[0][1][0].content;
    expect(prompt).toContain('building_startup');
    expect(prompt).toContain('music-production');
  });

  it('extracts the JSON array from markdown-wrapped output', async () => {
    mockAuthed('dbu1');
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      userId: 'dbu1',
      title: null,
      messages: MESSAGES,
    });
    (cascadeCollect as jest.Mock).mockResolvedValue({
      text: '```json\n[{"type":"question","text":"Tell me more","icon":"sparkles","relevanceScore":0.7}]\n```',
    });
    const res = await POST(makeRequest({ conversationId: 'c1' }));
    const data = await res.json();
    expect(data.suggestions).toHaveLength(1);
    expect(data.suggestions[0].text).toBe('Tell me more');
  });

  it('returns empty suggestions honestly when the LLM returns garbage', async () => {
    mockAuthed('dbu1');
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      userId: 'dbu1',
      title: null,
      messages: MESSAGES,
    });
    (cascadeCollect as jest.Mock).mockResolvedValue({ text: 'no json here' });
    const res = await POST(makeRequest({ conversationId: 'c1' }));
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
    expect(data.contextUsed).toBe(3);
  });

  it('returns empty suggestions honestly when the cascade throws', async () => {
    mockAuthed('dbu1');
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      userId: 'dbu1',
      title: null,
      messages: MESSAGES,
    });
    (cascadeCollect as jest.Mock).mockRejectedValue(new Error('all providers down'));
    const res = await POST(makeRequest({ conversationId: 'c1' }));
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
  });
});
