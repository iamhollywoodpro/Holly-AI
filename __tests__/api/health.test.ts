import { GET } from '../../app/api/health/route';

jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

describe('GET /api/health', () => {
  it('returns 200 status', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('includes sovereignty manifest in response', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('sovereignty');
    expect(body.sovereignty).toHaveProperty('consciousnessModules');
    expect(body.sovereignty).toHaveProperty('modelRouter');
    expect(body.sovereignty).toHaveProperty('autonomousCrons');
    expect(Array.isArray(body.sovereignty.consciousnessModules)).toBe(true);
    expect(body.sovereignty.consciousnessModules.length).toBeGreaterThan(0);
  });
});
