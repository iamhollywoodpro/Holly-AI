/**
 * Notion Integration — Route Handler Tests
 *
 * Tests the Notion auth and save route handlers.
 * The Notion integration has no client library — logic lives in routes.
 */

const notionMockFetch = jest.fn();
global.fetch = notionMockFetch;

// Set env vars before module import
const savedNotionEnv = { ...process.env };
process.env.NOTION_CLIENT_ID = 'ntn_client_123';
process.env.NOTION_CLIENT_SECRET = 'ntn_secret_456';
process.env.NOTION_REDIRECT_URI = 'http://localhost:3000/api/notion/callback';
// @ts-expect-error — test needs to set NODE_ENV for cookie secure flag
process.env.NODE_ENV = 'test';

// Mock Clerk
const mockAuth = jest.fn();
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

// Mock Prisma
const mockPrismaIntegration = {
  findFirst: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
};
jest.mock('@/lib/db', () => ({
  prisma: {
    integration: mockPrismaIntegration,
  },
}));

import { GET as notionAuthGet } from '../../app/api/notion/auth/route';
import { POST as notionSavePost } from '../../app/api/notion/save/route';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockReset();
  notionMockFetch.mockReset();
  Object.values(mockPrismaIntegration).forEach(m => m.mockReset());
});

afterAll(() => {
  process.env = savedNotionEnv;
});

function createRequest(body?: Record<string, unknown>): any {
  return {
    method: body ? 'POST' : 'GET',
    url: 'http://localhost:3000/api/notion/save',
    json: () => Promise.resolve(body || {}),
    nextUrl: { searchParams: new URLSearchParams() },
  };
}

describe('Notion Auth Route', () => {
  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await notionAuthGet(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should redirect to Notion OAuth with state cookie', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });

    const response = await notionAuthGet(createRequest());

    // Should be a redirect response
    expect(response.status).toBe(307);
    const location = response.headers.get('location') || '';
    expect(location).toContain('api.notion.com/v1/oauth/authorize');
    expect(location).toContain('client_id=ntn_client_123');
    expect(location).toContain('response_type=code');
    expect(location).toContain('owner=user');

    // Should set state cookie
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain('notion_oauth_state');
  });
});

describe('Notion Save Route', () => {
  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await notionSavePost(createRequest({ title: 'Test' }));
    expect(response.status).toBe(401);
  });

  it('should return 503 when Notion not connected', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce(null);

    const response = await notionSavePost(createRequest({ title: 'Test', content: 'Hello' }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('not connected');
  });

  it('should return 400 when title is missing', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    const response = await notionSavePost(createRequest({ content: 'No title' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('title');
  });

  it('should save a note to Notion workspace', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    notionMockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'page_123', url: 'https://notion.so/page_123' }),
    });

    const response = await notionSavePost(createRequest({
      title: 'Song Idea',
      content: 'Great melody idea',
      type: 'song_idea',
    }));
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(data.pageId).toBe('page_123');
    expect(data.message).toContain('Song Idea');

    // Verify API call
    expect(notionMockFetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/pages',
      expect.objectContaining({ method: 'POST' }),
    );

    const callBody = JSON.parse(notionMockFetch.mock.calls[0][1].body);
    expect(callBody.parent).toEqual({ type: 'workspace', workspace: true });
    // Should include emoji in title
    expect(callBody.properties.title.title[0].text.content).toContain('🎵');
    // Should have content blocks
    expect(callBody.children).toHaveLength(1);
    expect(callBody.children[0].type).toBe('paragraph');
  });

  it('should save to database when databaseId provided', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    notionMockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'page_456', url: 'https://notion.so/page_456' }),
    });

    await notionSavePost(createRequest({
      title: 'Lyric Draft',
      type: 'lyric',
      databaseId: 'db_789',
      tags: ['verse', 'chorus'],
    }));

    const callBody = JSON.parse(notionMockFetch.mock.calls[0][1].body);
    expect(callBody.parent).toEqual({ database_id: 'db_789' });
    expect(callBody.properties.Tags).toBeDefined();
    expect(callBody.properties.Tags.multi_select).toHaveLength(2);
    expect(callBody.properties.Type.select.name).toBe('lyric');
    expect(callBody.properties.Source.select.name).toBe('HOLLY AI');
  });

  it('should split long content into 2000-char chunks', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    notionMockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'page_long', url: 'https://notion.so/page_long' }),
    });

    const longContent = 'A'.repeat(4500);
    await notionSavePost(createRequest({
      title: 'Long Note',
      content: longContent,
    }));

    const callBody = JSON.parse(notionMockFetch.mock.calls[0][1].body);
    // 4500 / 2000 = 3 chunks (2000 + 2000 + 500)
    expect(callBody.children).toHaveLength(3);
  });

  it('should use correct Notion-Version header', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    notionMockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'p1', url: 'https://notion.so/p1' }),
    });

    await notionSavePost(createRequest({ title: 'Test' }));

    const headers = notionMockFetch.mock.calls[0][1].headers;
    expect(headers['Notion-Version']).toBe('2022-06-28');
    expect(headers['Authorization']).toBe('Bearer ntn_token');
  });

  it('should handle Notion API error', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    notionMockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Unauthorized' }),
    });

    const response = await notionSavePost(createRequest({ title: 'Test' }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain('Failed to save');
  });

  it('should use default type "note" when type not specified', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockPrismaIntegration.findFirst.mockResolvedValueOnce({ accessToken: 'ntn_token' });

    notionMockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'p1', url: 'https://notion.so/p1' }),
    });

    await notionSavePost(createRequest({ title: 'Just a note' }));

    const callBody = JSON.parse(notionMockFetch.mock.calls[0][1].body);
    expect(callBody.properties.title.title[0].text.content).toContain('📝');
  });
});
