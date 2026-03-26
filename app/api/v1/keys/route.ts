/**
 * /api/v1/keys — Phase 7: API Key Management
 *
 * POST   /api/v1/keys          — create a new API key (returns raw key ONCE)
 * GET    /api/v1/keys          — list all keys for the authenticated user
 *
 * Auth:  Clerk session (user must be signed in — these are management endpoints)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { generateRawKey, hashKey, keyPrefix } from '@/src/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── POST — create key ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(clerkId);

    // Max 10 active keys per user
    const activeCount = await prisma.apiKey.count({
      where: { userId: dbUser.id, isActive: true },
    });
    if (activeCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 active API keys reached. Revoke an existing key first.' },
        { status: 422 },
      );
    }

    const body = await req.json().catch(() => ({})) as {
      name?:      string;
      scopes?:    string[];
      expiresAt?: string;   // ISO string or null
      rpmLimit?:  number;
      rpdLimit?:  number;
    };

    const name     = (body.name || 'My API Key').slice(0, 64);
    const scopes   = Array.isArray(body.scopes) ? body.scopes : ['chat'];
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const rpmLimit  = Math.min(Math.max(body.rpmLimit ?? 20, 1), 100);
    const rpdLimit  = Math.min(Math.max(body.rpdLimit ?? 1000, 1), 10000);

    const rawKey  = generateRawKey();
    const kHash   = hashKey(rawKey);
    const kPrefix = keyPrefix(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId:    dbUser.id,
        name,
        keyHash:   kHash,
        keyPrefix: kPrefix,
        scopes,
        expiresAt,
        rpmLimit,
        rpdLimit,
        isActive:  true,
      },
    });

    // Return rawKey only here — it's never stored and never returned again
    return NextResponse.json({
      ok: true,
      key: {
        id:        apiKey.id,
        name:      apiKey.name,
        rawKey,                   // ← shown ONCE
        prefix:    kPrefix,
        scopes:    apiKey.scopes,
        rpmLimit:  apiKey.rpmLimit,
        rpdLimit:  apiKey.rpdLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[API Keys POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── GET — list keys ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(clerkId);

    const keys = await prisma.apiKey.findMany({
      where:   { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id:         true,
        name:       true,
        keyPrefix:  true,
        scopes:     true,
        isActive:   true,
        rpmLimit:   true,
        rpdLimit:   true,
        expiresAt:  true,
        lastUsedAt: true,
        createdAt:  true,
        // aggregate usage
        _count: { select: { usageLogs: true } },
      },
    });

    return NextResponse.json({
      ok:   true,
      keys: keys.map(k => ({
        ...k,
        totalRequests: k._count.usageLogs,
        _count: undefined,
      })),
    });
  } catch (err) {
    console.error('[API Keys GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
