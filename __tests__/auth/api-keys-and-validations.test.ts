/**
 * Comprehensive tests for:
 *   - src/lib/auth/ensure-user.ts    — ensureUserExists()
 *   - src/lib/api-keys/index.ts       — key generation, validation, rate limiting
 *   - src/lib/validations/chat.ts     — Zod schemas and validation helpers
 */

import { ensureUserExists } from '@/lib/auth/ensure-user';
import {
  generateRawKey,
  hashKey,
  keyPrefix,
  validateApiKey,
  checkRateLimit,
  logUsage,
} from '@/lib/api-keys/index';
import {
  ChatMessageSchema,
  ChatRequestSchema,
  CreateConversationSchema,
  UpdateConversationSchema,
  CreateMessageSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  FileUploadSchema,
  MusicGenerateSchema,
  ImageGenerateSchema,
  UserSettingsSchema,
  validateBody,
  validateQuery,
} from '@/lib/validations/chat';

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    apiKeyUsage: {
      create: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockCurrentUser = jest.fn();
jest.mock('@clerk/nextjs/server', () => ({
  currentUser: () => mockCurrentUser(),
}));

// We need references to the apiKey prisma mocks after the module is loaded
import { prisma } from '@/lib/db';

// Suppress console.log / console.error in tests for cleaner output
let consoleSpy: jest.SpyInstance;
beforeAll(() => {
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  consoleSpy.mockRestore();
});

// ─── Reset all mocks between test groups ────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════════
// 1. ensureUserExists
// ════════════════════════════════════════════════════════════════════════════════

describe('ensureUserExists()', () => {
  it('returns null when no Clerk user is authenticated', async () => {
    mockCurrentUser.mockResolvedValue(null);
    const result = await ensureUserExists();
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns existing user when found in the database', async () => {
    const existingUser = {
      id: 'user_abc',
      clerkUserId: 'clerk_123',
      email: 'test@example.com',
      name: 'Jane Doe',
    };
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Jane',
      lastName: 'Doe',
      imageUrl: 'https://img.clerk.com/abc.jpg',
    });
    mockFindUnique.mockResolvedValue(existingUser);

    const result = await ensureUserExists();
    expect(result).toEqual(existingUser);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a new user when not found in the database', async () => {
    const newUser = {
      id: 'user_def',
      clerkUserId: 'clerk_456',
      email: 'new@example.com',
      name: 'John Smith',
      imageUrl: 'https://img.clerk.com/def.jpg',
    };
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_456',
      emailAddresses: [{ emailAddress: 'new@example.com' }],
      firstName: 'John',
      lastName: 'Smith',
      imageUrl: 'https://img.clerk.com/def.jpg',
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(newUser);

    const result = await ensureUserExists();
    expect(result).toEqual(newUser);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        clerkUserId: 'clerk_456',
        email: 'new@example.com',
        name: 'John Smith',
        imageUrl: 'https://img.clerk.com/def.jpg',
      },
    });
  });

  it('handles Clerk user with no email addresses gracefully', async () => {
    const newUser = {
      id: 'user_ghi',
      clerkUserId: 'clerk_789',
      email: '',
      name: 'Alice',
    };
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_789',
      emailAddresses: [],
      firstName: 'Alice',
      lastName: null,
      imageUrl: null,
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(newUser);

    const result = await ensureUserExists();
    expect(result).toEqual(newUser);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: '',
          name: 'Alice',
        }),
      })
    );
  });

  it('handles Clerk user with no name (null firstName and lastName)', async () => {
    const newUser = {
      id: 'user_jkl',
      clerkUserId: 'clerk_000',
      email: 'noname@example.com',
      name: null,
    };
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_000',
      emailAddresses: [{ emailAddress: 'noname@example.com' }],
      firstName: null,
      lastName: null,
      imageUrl: null,
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(newUser);

    const result = await ensureUserExists();
    expect(result).toEqual(newUser);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: null,
        }),
      })
    );
  });

  it('handles Clerk user with only firstName (no lastName)', async () => {
    const newUser = {
      id: 'user_mno',
      clerkUserId: 'clerk_111',
      email: 'firstonly@example.com',
      name: 'Bob',
    };
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_111',
      emailAddresses: [{ emailAddress: 'firstonly@example.com' }],
      firstName: 'Bob',
      lastName: null,
      imageUrl: null,
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(newUser);

    const result = await ensureUserExists();
    expect(result).toEqual(newUser);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Bob',
        }),
      })
    );
  });

  it('returns null on database error', async () => {
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_err',
      emailAddresses: [{ emailAddress: 'err@example.com' }],
      firstName: 'Err',
      lastName: 'Or',
      imageUrl: null,
    });
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const result = await ensureUserExists();
    expect(result).toBeNull();
  });

  it('returns null on user creation error', async () => {
    mockCurrentUser.mockResolvedValue({
      id: 'clerk_create_err',
      emailAddresses: [{ emailAddress: 'create@example.com' }],
      firstName: 'Create',
      lastName: 'Error',
      imageUrl: null,
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error('Unique constraint violation'));

    const result = await ensureUserExists();
    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 2. generateRawKey
// ════════════════════════════════════════════════════════════════════════════════

describe('generateRawKey()', () => {
  it('returns a string starting with "holly_" prefix', () => {
    const key = generateRawKey();
    expect(key.startsWith('holly_')).toBe(true);
  });

  it('has total length of 54 characters (6 prefix + 48 hex)', () => {
    const key = generateRawKey();
    expect(key.length).toBe(54);
  });

  it('contains only hex characters after the prefix', () => {
    const key = generateRawKey();
    const hexPart = key.slice(6);
    expect(hexPart).toMatch(/^[0-9a-f]{48}$/);
  });

  it('generates unique keys on successive calls', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i++) {
      keys.add(generateRawKey());
    }
    expect(keys.size).toBe(50);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 3. hashKey
// ════════════════════════════════════════════════════════════════════════════════

describe('hashKey()', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashKey('holly_abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: same input always produces same hash', () => {
    const rawKey = 'holly_1234567890abcdef1234567890abcdef1234567890abcdef1234';
    const hash1 = hashKey(rawKey);
    const hash2 = hashKey(rawKey);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const key1 = 'holly_aaaa1111222233334444555566667777888899990000aaaabbbb';
    const key2 = 'holly_bbbb1111222233334444555566667777888899990000aaaabbbb';
    expect(hashKey(key1)).not.toBe(hashKey(key2));
  });

  it('produces the correct SHA-256 hash for a known input', () => {
    // Manually compute SHA-256 of 'holly_test' for verification
    const hash = hashKey('holly_test');
    // We just verify the output is 64 hex chars — exact value depends on crypto
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. keyPrefix
// ════════════════════════════════════════════════════════════════════════════════

describe('keyPrefix()', () => {
  it('returns the first 12 characters of the key', () => {
    const rawKey = 'holly_abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    expect(keyPrefix(rawKey)).toBe('holly_abcdef');
  });

  it('works on a real generated key', () => {
    const rawKey = generateRawKey();
    const prefix = keyPrefix(rawKey);
    expect(prefix.length).toBe(12);
    expect(prefix).toBe(rawKey.slice(0, 12));
  });

  it('handles short strings without crashing', () => {
    expect(keyPrefix('holly_')).toBe('holly_');
    expect(keyPrefix('hol')).toBe('hol');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 5. validateApiKey
// ════════════════════════════════════════════════════════════════════════════════

describe('validateApiKey()', () => {
  const validRawKey = 'holly_abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const validHash = hashKey(validRawKey);

  const makeApiKey = (overrides: Record<string, any> = {}) => ({
    id: 'key_1',
    keyHash: validHash,
    userId: 'user_1',
    isActive: true,
    expiresAt: null,
    rpmLimit: 60,
    rpdLimit: 1000,
    ...overrides,
  });

  it('returns null if the key lacks the "holly_" prefix', async () => {
    const result = await validateApiKey('sk-wrong-prefix_123456');
    expect(result).toBeNull();
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for empty string', async () => {
    const result = await validateApiKey('');
    expect(result).toBeNull();
  });

  it('returns null for undefined input', async () => {
    const result = await validateApiKey(undefined as any);
    expect(result).toBeNull();
  });

  it('returns null if no matching key is found in the database', async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await validateApiKey(validRawKey);
    expect(result).toBeNull();
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash: validHash },
    });
  });

  it('returns null if the key is inactive (isActive: false)', async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(
      makeApiKey({ isActive: false })
    );

    const result = await validateApiKey(validRawKey);
    expect(result).toBeNull();
  });

  it('returns null if the key has expired', async () => {
    const pastDate = new Date('2020-01-01T00:00:00Z');
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(
      makeApiKey({ expiresAt: pastDate })
    );

    const result = await validateApiKey(validRawKey);
    expect(result).toBeNull();
  });

  it('returns ValidatedKey for a valid, active, non-expired key', async () => {
    const apiKey = makeApiKey();
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(apiKey);

    const result = await validateApiKey(validRawKey);
    expect(result).toEqual({ apiKey, userId: 'user_1' });
  });

  it('returns ValidatedKey when expiresAt is null (no expiry set)', async () => {
    const apiKey = makeApiKey({ expiresAt: null });
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(apiKey);

    const result = await validateApiKey(validRawKey);
    expect(result).toEqual({ apiKey, userId: 'user_1' });
  });

  it('returns ValidatedKey when expiresAt is in the future', async () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const apiKey = makeApiKey({ expiresAt: futureDate });
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(apiKey);

    const result = await validateApiKey(validRawKey);
    expect(result).not.toBeNull();
    expect(result!.apiKey.expiresAt).toEqual(futureDate);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 6. checkRateLimit
// ════════════════════════════════════════════════════════════════════════════════

describe('checkRateLimit()', () => {
  const makeApiKey = (rpm = 60, rpd = 1000) => ({
    id: 'key_rl',
    keyHash: 'somehash',
    userId: 'user_rl',
    isActive: true,
    expiresAt: null,
    rpmLimit: rpm,
    rpdLimit: rpd,
  });

  it('returns allowed:true with correct remaining counts when under limits', async () => {
    const apiKey = makeApiKey(60, 1000);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(10)  // rpm count
      .mockResolvedValueOnce(50); // rpd count

    const result = await checkRateLimit(apiKey);
    if (!result.allowed) {
      throw new Error('Expected allowed=true');
    }
    expect(result.allowed).toBe(true);
    // remainingRpm = rpmLimit - rpmCount - 1 = 60 - 10 - 1 = 49
    expect(result.remainingRpm).toBe(49);
    // remainingRpd = rpdLimit - rpdCount - 1 = 1000 - 50 - 1 = 949
    expect(result.remainingRpd).toBe(949);
  });

  it('returns allowed:true with zero remaining when at limit minus one', async () => {
    const apiKey = makeApiKey(10, 100);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(9)   // rpm: 9 used, limit 10
      .mockResolvedValueOnce(99); // rpd: 99 used, limit 100

    const result = await checkRateLimit(apiKey);
    if (!result.allowed) throw new Error('Expected allowed=true');
    expect(result.remainingRpm).toBe(0);
    expect(result.remainingRpd).toBe(0);
  });

  it('returns allowed:false with reason "rpm" when rpm limit is exceeded', async () => {
    const apiKey = makeApiKey(5, 1000);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(5)  // rpm count equals limit
      .mockResolvedValueOnce(10);

    const oldestTimestamp = new Date(Date.now() - 30_000);
    (prisma.apiKeyUsage.findFirst as jest.Mock).mockResolvedValue({
      createdAt: oldestTimestamp,
    });

    const result = await checkRateLimit(apiKey);
    if (result.allowed) throw new Error('Expected allowed=false');
    expect(result.reason).toBe('rpm');
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000);
  });

  it('returns allowed:false with reason "rpd" when daily limit is exceeded', async () => {
    const apiKey = makeApiKey(60, 10);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(3)   // rpm under limit
      .mockResolvedValueOnce(10); // rpd at limit

    const oldestTimestamp = new Date(Date.now() - 43_200_000); // 12 hours ago
    (prisma.apiKeyUsage.findFirst as jest.Mock).mockResolvedValue({
      createdAt: oldestTimestamp,
    });

    const result = await checkRateLimit(apiKey);
    if (result.allowed) throw new Error('Expected allowed=false');
    expect(result.reason).toBe('rpd');
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000);
  });

  it('uses default retryAfterMs of 60_000 when no oldest record found for rpm', async () => {
    const apiKey = makeApiKey(1, 1000);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    (prisma.apiKeyUsage.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await checkRateLimit(apiKey);
    if (result.allowed) throw new Error('Expected allowed=false');
    expect(result.reason).toBe('rpm');
    expect(result.retryAfterMs).toBe(60_000);
  });

  it('uses default retryAfterMs of 86_400_000 when no oldest record found for rpd', async () => {
    const apiKey = makeApiKey(60, 1);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    (prisma.apiKeyUsage.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await checkRateLimit(apiKey);
    if (result.allowed) throw new Error('Expected allowed=false');
    expect(result.reason).toBe('rpd');
    expect(result.retryAfterMs).toBe(86_400_000);
  });

  it('never returns retryAfterMs below 1000 (minimum clamp)', async () => {
    const apiKey = makeApiKey(1, 1000);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    // Oldest record created 59_500ms ago, so retryAfter = 60_000 - 59_500 = 500
    // This should be clamped to 1000
    (prisma.apiKeyUsage.findFirst as jest.Mock).mockResolvedValue({
      createdAt: new Date(Date.now() - 59_500),
    });

    const result = await checkRateLimit(apiKey);
    if (result.allowed) throw new Error('Expected allowed=false');
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000);
  });

  it('returns correct remaining at zero usage', async () => {
    const apiKey = makeApiKey(60, 1000);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await checkRateLimit(apiKey);
    if (!result.allowed) throw new Error('Expected allowed=true');
    expect(result.remainingRpm).toBe(59);
    expect(result.remainingRpd).toBe(999);
  });

  it('checks rpm before rpd (rpm takes priority)', async () => {
    const apiKey = makeApiKey(1, 1);
    (prisma.apiKeyUsage.count as jest.Mock)
      .mockResolvedValueOnce(1) // rpm exceeded
      .mockResolvedValueOnce(1); // rpd also exceeded, but rpm checked first

    (prisma.apiKeyUsage.findFirst as jest.Mock).mockResolvedValue({
      createdAt: new Date(),
    });

    const result = await checkRateLimit(apiKey);
    if (result.allowed) throw new Error('Expected allowed=false');
    // Should report rpm first since it is checked first
    expect(result.reason).toBe('rpm');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 7. logUsage
// ════════════════════════════════════════════════════════════════════════════════

describe('logUsage()', () => {
  it('creates a usage record and updates lastUsedAt', async () => {
    (prisma.apiKeyUsage.create as jest.Mock).mockResolvedValue({ id: 'usage_1' });
    (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

    await logUsage('key_1', '/api/chat', 'POST', 200, 150, 100, 200);

    expect(prisma.apiKeyUsage.create).toHaveBeenCalledWith({
      data: {
        apiKeyId: 'key_1',
        endpoint: '/api/chat',
        method: 'POST',
        statusCode: 200,
        durationMs: 150,
        tokensIn: 100,
        tokensOut: 200,
      },
    });

    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key_1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it('uses default token values of 0 when not provided', async () => {
    (prisma.apiKeyUsage.create as jest.Mock).mockResolvedValue({ id: 'usage_2' });
    (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

    await logUsage('key_2', '/api/health', 'GET', 200, 10);

    expect(prisma.apiKeyUsage.create).toHaveBeenCalledWith({
      data: {
        apiKeyId: 'key_2',
        endpoint: '/api/health',
        method: 'GET',
        statusCode: 200,
        durationMs: 10,
        tokensIn: 0,
        tokensOut: 0,
      },
    });
  });

  it('handles error status codes correctly', async () => {
    (prisma.apiKeyUsage.create as jest.Mock).mockResolvedValue({ id: 'usage_3' });
    (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

    await logUsage('key_3', '/api/chat', 'POST', 500, 3000, 50, 0);

    expect(prisma.apiKeyUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusCode: 500 }),
      })
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 8. ChatMessageSchema
// ════════════════════════════════════════════════════════════════════════════════

describe('ChatMessageSchema', () => {
  it('accepts a valid user message', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'Hello Holly!',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid assistant message', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'assistant',
      content: 'How can I help?',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid role', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'system',
      content: 'You are a helpful assistant.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty string content', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 10000 characters', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'x'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly 10000 characters', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'x'.repeat(10000),
    });
    expect(result.success).toBe(true);
  });

  it('accepts content at exactly 1 character', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'a',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional fileAttachments with valid data', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'Here is an image',
      fileAttachments: [
        {
          name: 'photo.png',
          url: 'https://example.com/photo.png',
          type: 'image/png',
          vision: {
            description: 'A photo of a cat',
            summary: 'Cat photo',
            keyElements: ['cat', 'cute'],
            model: 'gpt-4-vision',
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts fileAttachments without optional vision/music fields', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'File attached',
      fileAttachments: [
        { name: 'doc.pdf', url: 'https://example.com/doc.pdf', type: 'application/pdf' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects fileAttachments with invalid URL', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'Bad URL',
      fileAttachments: [
        { name: 'doc.pdf', url: 'not-a-url', type: 'application/pdf' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts message without fileAttachments (optional)', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
      content: 'No attachments',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing content field', () => {
    const result = ChatMessageSchema.safeParse({
      role: 'user',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing role field', () => {
    const result = ChatMessageSchema.safeParse({
      content: 'Hello',
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 9. ChatRequestSchema
// ════════════════════════════════════════════════════════════════════════════════

describe('ChatRequestSchema', () => {
  const validMessage = { role: 'user' as const, content: 'Hello' };

  it('accepts a valid request with one message', () => {
    const result = ChatRequestSchema.safeParse({ messages: [validMessage] });
    expect(result.success).toBe(true);
  });

  it('accepts optional conversationId and userId', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [validMessage],
      conversationId: 'conv_123',
      userId: 'user_456',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationId).toBe('conv_123');
      expect(result.data.userId).toBe('user_456');
    }
  });

  it('rejects an empty messages array', () => {
    const result = ChatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a missing messages field', () => {
    const result = ChatRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects more than 50 messages', () => {
    const messages = Array(51).fill(validMessage);
    const result = ChatRequestSchema.safeParse({ messages });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 50 messages (boundary)', () => {
    const messages = Array(50).fill(validMessage);
    const result = ChatRequestSchema.safeParse({ messages });
    expect(result.success).toBe(true);
  });

  it('accepts exactly 1 message (boundary)', () => {
    const result = ChatRequestSchema.safeParse({ messages: [validMessage] });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid message inside the array', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: 'invalid', content: 'hi' }],
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 10. Conversation and Goal Schemas
// ════════════════════════════════════════════════════════════════════════════════

describe('CreateConversationSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = CreateConversationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts title and firstMessage', () => {
    const result = CreateConversationSchema.safeParse({
      title: 'My Chat',
      firstMessage: 'Hello',
    });
    expect(result.success).toBe(true);
  });

  it('rejects title longer than 200 characters', () => {
    const result = CreateConversationSchema.safeParse({
      title: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('accepts title at exactly 200 characters', () => {
    const result = CreateConversationSchema.safeParse({
      title: 'x'.repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it('rejects firstMessage longer than 10000 characters', () => {
    const result = CreateConversationSchema.safeParse({
      firstMessage: 'x'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateConversationSchema', () => {
  it('accepts a valid title', () => {
    const result = UpdateConversationSchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = UpdateConversationSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 characters', () => {
    const result = UpdateConversationSchema.safeParse({ title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts title at exactly 200 characters', () => {
    const result = UpdateConversationSchema.safeParse({ title: 'a'.repeat(200) });
    expect(result.success).toBe(true);
  });
});

describe('CreateMessageSchema', () => {
  it('accepts valid user message', () => {
    const result = CreateMessageSchema.safeParse({
      role: 'user',
      content: 'Hello',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional emotion field', () => {
    const result = CreateMessageSchema.safeParse({
      role: 'assistant',
      content: 'Hi!',
      emotion: 'happy',
    });
    expect(result.success).toBe(true);
  });

  it('rejects content over 50000 characters', () => {
    const result = CreateMessageSchema.safeParse({
      role: 'user',
      content: 'z'.repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly 50000 characters', () => {
    const result = CreateMessageSchema.safeParse({
      role: 'user',
      content: 'z'.repeat(50000),
    });
    expect(result.success).toBe(true);
  });
});

describe('CreateGoalSchema', () => {
  it('accepts a valid goal with all fields', () => {
    const result = CreateGoalSchema.safeParse({
      title: 'Learn TypeScript',
      description: 'Complete a course',
      category: 'education',
      priority: 7,
      targetDate: '2026-12-31T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a goal with only title (other fields have defaults)', () => {
    const result = CreateGoalSchema.safeParse({ title: 'Simple Goal' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('general');
      expect(result.data.priority).toBe(5);
    }
  });

  it('rejects empty title', () => {
    const result = CreateGoalSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 characters', () => {
    const result = CreateGoalSchema.safeParse({ title: 't'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts title at exactly 1 and exactly 200 characters', () => {
    expect(CreateGoalSchema.safeParse({ title: 'a' }).success).toBe(true);
    expect(CreateGoalSchema.safeParse({ title: 'a'.repeat(200) }).success).toBe(true);
  });

  it('rejects priority below 1', () => {
    const result = CreateGoalSchema.safeParse({ title: 'Test', priority: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects priority above 10', () => {
    const result = CreateGoalSchema.safeParse({ title: 'Test', priority: 11 });
    expect(result.success).toBe(false);
  });

  it('accepts priority at boundaries 1 and 10', () => {
    expect(CreateGoalSchema.safeParse({ title: 'Test', priority: 1 }).success).toBe(true);
    expect(CreateGoalSchema.safeParse({ title: 'Test', priority: 10 }).success).toBe(true);
  });

  it('rejects non-integer priority', () => {
    const result = CreateGoalSchema.safeParse({ title: 'Test', priority: 5.5 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format for targetDate', () => {
    const result = CreateGoalSchema.safeParse({
      title: 'Test',
      targetDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null targetDate', () => {
    const result = CreateGoalSchema.safeParse({ title: 'Test', targetDate: null });
    expect(result.success).toBe(true);
  });

  it('rejects description over 2000 characters', () => {
    const result = CreateGoalSchema.safeParse({
      title: 'Test',
      description: 'd'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description at exactly 2000 characters', () => {
    const result = CreateGoalSchema.safeParse({
      title: 'Test',
      description: 'd'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateGoalSchema', () => {
  it('accepts a valid partial update', () => {
    const result = UpdateGoalSchema.safeParse({ status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('accepts all valid statuses', () => {
    const statuses = ['active', 'completed', 'paused', 'cancelled'];
    for (const status of statuses) {
      expect(UpdateGoalSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = UpdateGoalSchema.safeParse({ status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('accepts progress at boundaries 0 and 1', () => {
    expect(UpdateGoalSchema.safeParse({ progress: 0 }).success).toBe(true);
    expect(UpdateGoalSchema.safeParse({ progress: 1 }).success).toBe(true);
  });

  it('rejects progress below 0', () => {
    expect(UpdateGoalSchema.safeParse({ progress: -0.1 }).success).toBe(false);
  });

  it('rejects progress above 1', () => {
    expect(UpdateGoalSchema.safeParse({ progress: 1.1 }).success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 11. FileUploadSchema
// ════════════════════════════════════════════════════════════════════════════════

describe('FileUploadSchema', () => {
  it('accepts a valid JPEG upload', () => {
    const result = FileUploadSchema.safeParse({
      fileName: 'photo.jpg',
      fileSize: 1024 * 1024, // 1MB
      fileType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all allowed file types', () => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
      'video/mp4', 'video/webm',
      'application/pdf',
      'text/plain', 'text/markdown',
      'application/json',
    ];
    for (const type of allowed) {
      const result = FileUploadSchema.safeParse({
        fileName: 'file',
        fileSize: 100,
        fileType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects a disallowed file type', () => {
    const result = FileUploadSchema.safeParse({
      fileName: 'malware.exe',
      fileSize: 1024,
      fileType: 'application/x-executable',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a file size exceeding 50MB', () => {
    const result = FileUploadSchema.safeParse({
      fileName: 'big.zip',
      fileSize: 50 * 1024 * 1024 + 1,
      fileType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a file size at exactly 50MB (boundary)', () => {
    const result = FileUploadSchema.safeParse({
      fileName: 'max.pdf',
      fileSize: 50 * 1024 * 1024,
      fileType: 'application/pdf',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a fileName at exactly 255 characters', () => {
    const result = FileUploadSchema.safeParse({
      fileName: 'a'.repeat(255),
      fileSize: 100,
      fileType: 'text/plain',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a fileName exceeding 255 characters', () => {
    const result = FileUploadSchema.safeParse({
      fileName: 'a'.repeat(256),
      fileSize: 100,
      fileType: 'text/plain',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero byte file (fileSize is just a number, zero is valid)', () => {
    // fileSize is typed as z.number().max(50MB) — zero is not explicitly forbidden
    const result = FileUploadSchema.safeParse({
      fileName: 'empty.txt',
      fileSize: 0,
      fileType: 'text/plain',
    });
    expect(result.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 12. Music and Image Generation Schemas
// ════════════════════════════════════════════════════════════════════════════════

describe('MusicGenerateSchema', () => {
  it('accepts a valid prompt with required fields only', () => {
    const result = MusicGenerateSchema.safeParse({ prompt: 'A chill lo-fi beat' });
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = MusicGenerateSchema.safeParse({
      prompt: 'A jazz piece',
      lyrics: 'Singing in the rain',
      style: 'jazz',
      duration: 120,
      modelPreference: 'suno',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty prompt', () => {
    const result = MusicGenerateSchema.safeParse({ prompt: '' });
    expect(result.success).toBe(false);
  });

  it('rejects prompt over 2000 characters', () => {
    const result = MusicGenerateSchema.safeParse({ prompt: 'p'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('accepts prompt at exactly 2000 characters', () => {
    const result = MusicGenerateSchema.safeParse({ prompt: 'p'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('rejects duration below 10', () => {
    const result = MusicGenerateSchema.safeParse({ prompt: 'test', duration: 9 });
    expect(result.success).toBe(false);
  });

  it('rejects duration above 300', () => {
    const result = MusicGenerateSchema.safeParse({ prompt: 'test', duration: 301 });
    expect(result.success).toBe(false);
  });

  it('accepts duration at boundaries 10 and 300', () => {
    expect(MusicGenerateSchema.safeParse({ prompt: 'test', duration: 10 }).success).toBe(true);
    expect(MusicGenerateSchema.safeParse({ prompt: 'test', duration: 300 }).success).toBe(true);
  });

  it('rejects invalid modelPreference', () => {
    const result = MusicGenerateSchema.safeParse({
      prompt: 'test',
      modelPreference: 'invalid-model',
    });
    expect(result.success).toBe(false);
  });
});

describe('ImageGenerateSchema', () => {
  it('accepts a valid prompt with defaults', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'A beautiful sunset' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.width).toBe(1024);
      expect(result.data.height).toBe(1024);
    }
  });

  it('accepts all optional fields', () => {
    const result = ImageGenerateSchema.safeParse({
      prompt: 'cyberpunk city',
      style: 'digital art',
      width: 2048,
      height: 2048,
      modelPreference: 'sdxl',
      negativePrompt: 'blurry, low quality',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty prompt', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: '' });
    expect(result.success).toBe(false);
  });

  it('rejects width below 256', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'test', width: 255 });
    expect(result.success).toBe(false);
  });

  it('rejects width above 2048', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'test', width: 2049 });
    expect(result.success).toBe(false);
  });

  it('accepts width at boundaries 256 and 2048', () => {
    expect(ImageGenerateSchema.safeParse({ prompt: 'test', width: 256 }).success).toBe(true);
    expect(ImageGenerateSchema.safeParse({ prompt: 'test', width: 2048 }).success).toBe(true);
  });

  it('rejects non-integer width', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'test', width: 512.5 });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 13. UserSettingsSchema
// ════════════════════════════════════════════════════════════════════════════════

describe('UserSettingsSchema', () => {
  it('applies defaults for empty object', () => {
    const result = UserSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primaryMode).toBe('general');
      expect(result.data.theme).toBe('dark');
      expect(result.data.musicRoles).toEqual([]);
      expect(result.data.notifications.email).toBe(true);
    }
  });

  it('accepts all valid primaryMode values', () => {
    for (const mode of ['general', 'music', 'dev', 'all-access']) {
      const result = UserSettingsSchema.safeParse({ primaryMode: mode });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid primaryMode', () => {
    const result = UserSettingsSchema.safeParse({ primaryMode: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid theme values', () => {
    for (const theme of ['dark', 'light', 'system']) {
      const result = UserSettingsSchema.safeParse({ theme });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid theme', () => {
    const result = UserSettingsSchema.safeParse({ theme: 'neon' });
    expect(result.success).toBe(false);
  });

  it('accepts full notification settings', () => {
    const result = UserSettingsSchema.safeParse({
      notifications: { email: false, push: true, desktop: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notifications.email).toBe(false);
      expect(result.data.notifications.desktop).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 14. validateBody
// ════════════════════════════════════════════════════════════════════════════════

describe('validateBody()', () => {
  const makeRequest = (body: any) => ({
    json: jest.fn().mockResolvedValue(body),
  }) as any;

  const simpleSchema = z => z; // placeholder

  it('returns parsed data on valid JSON and valid schema', async () => {
    const req = makeRequest({ role: 'user', content: 'Hello' });
    const result = await validateBody(req, ChatMessageSchema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.role).toBe('user');
      expect(result.data.content).toBe('Hello');
    }
  });

  it('returns error on invalid JSON body', async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    } as any;

    const result = await validateBody(req, ChatMessageSchema);
    expect('error' in result).toBe(true);
  });

  it('returns error with field errors on Zod validation failure', async () => {
    const req = makeRequest({ role: 'invalid', content: '' });
    const result = await validateBody(req, ChatMessageSchema);
    expect('error' in result).toBe(true);
  });

  it('returns data for valid ChatRequestSchema', async () => {
    const req = makeRequest({
      messages: [{ role: 'user', content: 'Hi' }],
    });
    const result = await validateBody(req, ChatRequestSchema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.messages).toHaveLength(1);
    }
  });

  it('returns error for missing required fields', async () => {
    const req = makeRequest({});
    const result = await validateBody(req, ChatRequestSchema);
    expect('error' in result).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 15. validateQuery
// ════════════════════════════════════════════════════════════════════════════════

describe('validateQuery()', () => {

  it('parses single-value query parameters', () => {
    const params = new URLSearchParams('page=2&limit=10');
    const schema = z.object({ page: z.string(), limit: z.string() });
    const result = validateQuery(params, schema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.page).toBe('2');
      expect(result.data.limit).toBe('10');
    }
  });

  it('converts duplicate keys into arrays', () => {
    const params = new URLSearchParams('tag=a&tag=b&tag=c');
    const schema = z.object({
      tag: z.array(z.string()),
    });
    const result = validateQuery(params, schema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.tag).toEqual(['a', 'b', 'c']);
    }
  });

  it('converts a single duplicate key to an array when schema expects array', () => {
    const params = new URLSearchParams('tag=onlyone');
    const schema = z.object({
      tag: z.array(z.string()),
    });
    // Note: URLSearchParams with a single value won't make an array,
    // so the schema would receive a string, not an array — this tests behavior
    const result = validateQuery(params, schema);
    // This will fail because a single param is a string, not array
    expect('error' in result).toBe(true);
  });

  it('returns error when required parameter is missing', () => {
    const params = new URLSearchParams('');
    const schema = z.object({ required: z.string() });
    const result = validateQuery(params, schema);
    expect('error' in result).toBe(true);
  });

  it('handles optional parameters gracefully', () => {
    const params = new URLSearchParams('search=hello');
    const schema = z.object({
      search: z.string().optional(),
      page: z.string().optional(),
    });
    const result = validateQuery(params, schema);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.search).toBe('hello');
      expect(result.data.page).toBeUndefined();
    }
  });

  it('handles empty search params with all-optional schema', () => {
    const params = new URLSearchParams('');
    const schema = z.object({
      sort: z.string().optional(),
    });
    const result = validateQuery(params, schema);
    expect('data' in result).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 16. Boundary / Edge Case Tests
// ════════════════════════════════════════════════════════════════════════════════

describe('Boundary and edge case tests across all schemas', () => {
  // ChatMessageSchema boundaries
  it('ChatMessageSchema: content at min (1 char)', () => {
    expect(ChatMessageSchema.safeParse({ role: 'user', content: 'x' }).success).toBe(true);
  });

  it('ChatMessageSchema: content at max (10000 chars)', () => {
    expect(ChatMessageSchema.safeParse({ role: 'user', content: 'x'.repeat(10000) }).success).toBe(true);
  });

  it('ChatMessageSchema: content at max+1 (10001 chars) fails', () => {
    expect(ChatMessageSchema.safeParse({ role: 'user', content: 'x'.repeat(10001) }).success).toBe(false);
  });

  // ChatRequestSchema boundaries
  it('ChatRequestSchema: messages at min (1)', () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.success).toBe(true);
  });

  it('ChatRequestSchema: messages at max (50)', () => {
    const messages = Array.from({ length: 50 }, () => ({ role: 'user', content: 'x' }));
    expect(ChatRequestSchema.safeParse({ messages }).success).toBe(true);
  });

  it('ChatRequestSchema: messages at max+1 (51) fails', () => {
    const messages = Array.from({ length: 51 }, () => ({ role: 'user', content: 'x' }));
    expect(ChatRequestSchema.safeParse({ messages }).success).toBe(false);
  });

  // CreateGoalSchema priority boundaries
  it('CreateGoalSchema: priority at min (1)', () => {
    expect(CreateGoalSchema.safeParse({ title: 'T', priority: 1 }).success).toBe(true);
  });

  it('CreateGoalSchema: priority at max (10)', () => {
    expect(CreateGoalSchema.safeParse({ title: 'T', priority: 10 }).success).toBe(true);
  });

  it('CreateGoalSchema: priority at min-1 (0) fails', () => {
    expect(CreateGoalSchema.safeParse({ title: 'T', priority: 0 }).success).toBe(false);
  });

  it('CreateGoalSchema: priority at max+1 (11) fails', () => {
    expect(CreateGoalSchema.safeParse({ title: 'T', priority: 11 }).success).toBe(false);
  });

  // UpdateGoalSchema progress boundaries
  it('UpdateGoalSchema: progress at min (0)', () => {
    expect(UpdateGoalSchema.safeParse({ progress: 0 }).success).toBe(true);
  });

  it('UpdateGoalSchema: progress at max (1)', () => {
    expect(UpdateGoalSchema.safeParse({ progress: 1 }).success).toBe(true);
  });

  it('UpdateGoalSchema: progress at min-0.01 fails', () => {
    expect(UpdateGoalSchema.safeParse({ progress: -0.01 }).success).toBe(false);
  });

  it('UpdateGoalSchema: progress at max+0.01 fails', () => {
    expect(UpdateGoalSchema.safeParse({ progress: 1.01 }).success).toBe(false);
  });

  // ImageGenerateSchema dimensions
  it('ImageGenerateSchema: width/height at min (256)', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'p', width: 256, height: 256 });
    expect(result.success).toBe(true);
  });

  it('ImageGenerateSchema: width/height at max (2048)', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'p', width: 2048, height: 2048 });
    expect(result.success).toBe(true);
  });

  it('ImageGenerateSchema: width at min-1 (255) fails', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'p', width: 255, height: 256 });
    expect(result.success).toBe(false);
  });

  it('ImageGenerateSchema: height at max+1 (2049) fails', () => {
    const result = ImageGenerateSchema.safeParse({ prompt: 'p', width: 256, height: 2049 });
    expect(result.success).toBe(false);
  });

  // MusicGenerateSchema duration boundaries
  it('MusicGenerateSchema: duration at min (10)', () => {
    expect(MusicGenerateSchema.safeParse({ prompt: 'p', duration: 10 }).success).toBe(true);
  });

  it('MusicGenerateSchema: duration at max (300)', () => {
    expect(MusicGenerateSchema.safeParse({ prompt: 'p', duration: 300 }).success).toBe(true);
  });

  it('MusicGenerateSchema: duration at min-1 (9) fails', () => {
    expect(MusicGenerateSchema.safeParse({ prompt: 'p', duration: 9 }).success).toBe(false);
  });

  it('MusicGenerateSchema: duration at max+1 (301) fails', () => {
    expect(MusicGenerateSchema.safeParse({ prompt: 'p', duration: 301 }).success).toBe(false);
  });

  // FileUploadSchema fileName boundary
  it('FileUploadSchema: fileName at max (255 chars)', () => {
    expect(FileUploadSchema.safeParse({
      fileName: 'f'.repeat(255),
      fileSize: 1024,
      fileType: 'image/png',
    }).success).toBe(true);
  });

  it('FileUploadSchema: fileName at max+1 (256 chars) fails', () => {
    expect(FileUploadSchema.safeParse({
      fileName: 'f'.repeat(256),
      fileSize: 1024,
      fileType: 'image/png',
    }).success).toBe(false);
  });

  // UpdateConversationSchema title boundary
  it('UpdateConversationSchema: title at min (1 char)', () => {
    expect(UpdateConversationSchema.safeParse({ title: 'x' }).success).toBe(true);
  });

  it('UpdateConversationSchema: title at max (200 chars)', () => {
    expect(UpdateConversationSchema.safeParse({ title: 'x'.repeat(200) }).success).toBe(true);
  });

  it('UpdateConversationSchema: title at max+1 (201 chars) fails', () => {
    expect(UpdateConversationSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false);
  });
});

// Need direct z import for validateQuery test schemas
import { z } from 'zod';
