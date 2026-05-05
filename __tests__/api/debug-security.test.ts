import { GET } from '../../app/api/debug/security-audit/route';
import * as clerkAuth from '@clerk/nextjs/server';

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'random@example.com',
      }),
    },
  },
}));

const mockedAuth = clerkAuth.auth as jest.Mock;
const mockedCurrentUser = clerkAuth.currentUser as jest.Mock;

describe('GET /api/debug/security-audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-admin users with 403', async () => {
    mockedAuth.mockResolvedValue({ userId: 'user_abc123' });
    mockedCurrentUser.mockResolvedValue({
      id: 'user_abc123',
      emailAddresses: [{ emailAddress: 'random@example.com', id: 'ea_1' }],
      primaryEmailAddress: { emailAddress: 'random@example.com', id: 'ea_1' },
      createdAt: new Date(),
    });

    const req = new Request('http://localhost:3000/api/debug/security-audit');
    const res = await GET(req as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/forbidden/i);
  });
});
