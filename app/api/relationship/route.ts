/**
 * Phase 8: Relationship Engine API
 * GET  — Get user's relationship profile, memories, milestones, context
 * POST — Manual memory operations (add, verify, delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { extractAndStoreMemories, rebuildRelationshipProfile, getRelationshipMemoryContext } from '@/lib/relationship/relationship-engine';

export async function GET(req: NextRequest) {
  const auth = await authenticateAndLoadUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { dbUserId } = auth;

  try {
    const [profile, context, memories, milestones] = await Promise.all([
      prisma.relationshipProfile.findUnique({ where: { userId: dbUserId! } }),
      prisma.relationshipContext.findUnique({ where: { userId: dbUserId! } }),
      prisma.relationshipMemory.findMany({
        where: { userId: dbUserId!, supersededById: null },
        orderBy: { importance: 'desc' },
        take: 100,
      }),
      prisma.relationshipMilestone.findMany({
        where: { userId: dbUserId! },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      profile,
      context,
      memories,
      milestones,
      memoryContextText: await getRelationshipMemoryContext(dbUserId!),
    });
  } catch (error) {
    console.error('[Relationship API] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load relationship data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAndLoadUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { dbUserId } = auth;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'rebuild_profile': {
        await rebuildRelationshipProfile(dbUserId!);
        return NextResponse.json({ success: true, message: 'Profile rebuilt' });
      }
      case 'add_memory': {
        const { category, domain, key, content } = body;
        if (!category || !key || !content) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        await extractAndStoreMemories(dbUserId!, content, '', '');
        return NextResponse.json({ success: true });
      }
      case 'verify_memory': {
        const { memoryId } = body;
        if (!memoryId) return NextResponse.json({ error: 'Missing memoryId' }, { status: 400 });
        await prisma.relationshipMemory.update({
          where: { id: memoryId, userId: dbUserId },
          data: { verified: true, confidence: 1.0 },
        });
        return NextResponse.json({ success: true });
      }
      case 'delete_memory': {
        const { memoryId } = body;
        if (!memoryId) return NextResponse.json({ error: 'Missing memoryId' }, { status: 400 });
        await prisma.relationshipMemory.deleteMany({ where: { id: memoryId, userId: dbUserId } });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Relationship API] POST failed:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
