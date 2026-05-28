/**
 * Canva Integration — Integration Tests
 *
 * Tests Canva PKCE OAuth helpers, auth URL generation, and token exchange.
 */

const canvaMockFetch = jest.fn();
global.fetch = canvaMockFetch;

const savedCanvaEnv = { ...process.env };
process.env.CANVA_CLIENT_ID = 'canva_client_123';
process.env.CANVA_CLIENT_SECRET = 'canva_secret_456';
process.env.CANVA_REDIRECT_URI = 'http://localhost:3000/api/canva/callback';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    canvaToken: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/monitoring/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  canvaIntegration,
} from '@/lib/design/canva-integration';

beforeEach(() => {
  canvaMockFetch.mockReset();
});

afterAll(() => {
  process.env = savedCanvaEnv;
});

describe('Canva Integration', () => {
  describe('PKCE helpers', () => {
    it('should generate a code verifier', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeTruthy();
      // PKCE spec: 43-128 URL-safe chars
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('should generate unique verifiers', () => {
      const verifiers = new Set(Array.from({ length: 10 }, () => generateCodeVerifier()));
      expect(verifiers.size).toBe(10);
    });

    it('should generate deterministic code challenge from verifier', () => {
      const verifier = 'test_verifier_123';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', () => {
      const c1 = generateCodeChallenge('verifier_one');
      const c2 = generateCodeChallenge('verifier_two');
      expect(c1).not.toBe(c2);
    });

    it('should generate state parameter', () => {
      const state = generateState();
      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
    });

    it('should generate unique states', () => {
      const states = new Set(Array.from({ length: 10 }, () => generateState()));
      expect(states.size).toBe(10);
    });
  });

  describe('isConfigured', () => {
    it('should return true when all env vars set', () => {
      expect(canvaIntegration.isConfigured()).toBe(true);
    });
  });

  describe('buildAuthUrl', () => {
    it('should generate Canva OAuth URL with PKCE params', () => {
      const verifier = generateCodeVerifier();
      const state = generateState();
      const url = canvaIntegration.buildAuthUrl(verifier, state);

      expect(url).toContain('canva.com/api/oauth/authorize');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('client_id=canva_client_123');
      expect(url).toContain('response_type=code');
    });

    it('should include correct scopes', () => {
      const url = canvaIntegration.buildAuthUrl('verifier', 'state');
      expect(decodeURIComponent(url)).toContain('design:content:read');
      expect(decodeURIComponent(url)).toContain('design:content:write');
      expect(decodeURIComponent(url)).toContain('profile:read');
    });

    it('should not include raw verifier in URL', () => {
      const verifier = 'my_secret_verifier';
      const url = canvaIntegration.buildAuthUrl(verifier, 'state');
      expect(url).not.toContain('my_secret_verifier');
    });
  });

  describe('exchangeCode', () => {
    it('should exchange code for tokens via API', async () => {
      canvaMockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'canva_at_123',
          refresh_token: 'canva_rt_456',
          expires_in: 3600,
          scope: 'design:content:read',
        }),
      });

      // Mock saveToken (prisma upsert)
      const { prisma } = jest.requireMock('@/lib/prisma');
      prisma.canvaToken.upsert.mockResolvedValueOnce({});

      await canvaIntegration.exchangeCode('auth_code', 'verifier', 'user_123');

      expect(canvaMockFetch).toHaveBeenCalledWith(
        'https://api.canva.com/rest/v1/oauth/token',
        expect.objectContaining({ method: 'POST' }),
      );

      // Verify Basic auth header
      const headers = canvaMockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toContain('Basic');

      // Verify PKCE body params
      const body = canvaMockFetch.mock.calls[0][1].body.toString();
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth_code');
      expect(body).toContain('code_verifier=verifier');
    });

    it('should throw on API error', async () => {
      canvaMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid code',
      });

      await expect(
        canvaIntegration.exchangeCode('bad_code', 'verifier', 'user_123'),
      ).rejects.toThrow('Canva token exchange failed');
    });
  });
});
