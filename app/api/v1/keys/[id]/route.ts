/**
 * /api/v1/keys/[id] — per-key operations
 *
 * GET    — get key details + usage stats
 * PATCH  — update name / scopes / limits
 * DELETE — revoke (soft-delete: isActive = false)
 *
 * Auth: Clerk session.  Users can only manage their own keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { getKeyStats } from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function resolveKey(clerkId: string, keyId: string) {
  const dbUser = await getOrCreateUser(clerkId);
  const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!apiKey || apiKey.userId !== dbUser.id) return null;
  return { apiKey, dbUser };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveKey(clerkId, params.id);
    if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { apiKey } = resolved;
    const stats = await getKeyStats(apiKey.id);

    // Last 20 usage entries
    const recent = await prisma.apiKeyUsage.findMany({
      where:   { apiKeyId: apiKey.id },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select: { endpoint: true, statusCode: true, durationMs: true, createdAt: true },
    });

    return NextResponse.json({
      ok:  true,
      key: {
        id:         apiKey.id,
        name:       apiKey.name,
        prefix:     apiKey.keyPrefix,
        scopes:     apiKey.scopes,
        isActive:   apiKey.isActive,
        rpmLimit:   apiKey.rpmLimit,
        rpdLimit:   apiKey.rpdLimit,
        expiresAt:  apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt:  apiKey.createdAt,
        stats,
        recentUsage: recent,
      },
    });
  } catch (err) {
    console.error('[API Keys GET/:id]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── PATCH — update ───────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveKey(clerkId, params.id);
    if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({})) as {
      name?:      string;
      scopes?:    string[];
      rpmLimit?:  number;
      rpdLimit?:  number;
      expiresAt?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (body.name     !== undefined) data.name     = body.name.slice(0, 64);
    if (body.scopes   !== undefined) data.scopes   = body.scopes;
    if (body.rpmLimit !== undefined) data.rpmLimit = Math.min(Math.max(body.rpmLimit, 1), 100);
    if (body.rpdLimit !== undefined) data.rpdLimit = Math.min(Math.max(body.rpdLimit, 1), 10000);
    if ('expiresAt' in body)         data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ ok: true, key: { id: updated.id, name: updated.name } });
  } catch (err) {
    console.error('[API Keys PATCH/:id]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── DELETE — revoke ──────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveKey(clerkId, params.id);
    if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.apiKey.update({
      where: { id: params.id },
      data:  { isActive: false },
    });

    return NextResponse.json({ ok: true, revoked: params.id });
  } catch (err) {
    console.error('[API Keys DELETE/:id]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
