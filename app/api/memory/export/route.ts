/**
 * POST /api/memory/export — Phase 16: Memory Portability
 *
 * Exports the user's full relationship with Holly as a portable JSON file.
 * Returns a downloadable JSON file in Holly Portable Relationship Format (HPRF) v1.0.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { exportFullRelationship } from '@/lib/memory/memory-portability';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await exportFullRelationship(clerkUserId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? 'Export failed' },
        { status: 500 }
      );
    }

    const filename = `holly-relationship-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(result.data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[MemoryExport API] Error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET returns export info (what will be exported, counts only)
export async function GET() {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const internalId = user.id;

    // Count what will be exported (only models that have userId)
    const [
      conversations,
      memories,
      milestones,
      learningGoals,
      knowledge,
      tasteSignals,
      insights,
    ] = await Promise.all([
      prisma.conversation.count({ where: { userId: internalId } }),
      prisma.memoryEmbedding.count({ where: { userId: internalId } }),
      prisma.relationshipMilestone.count({ where: { userId: internalId } }),
      prisma.learningGoal.count({ where: { userId: internalId } }),
      prisma.knowledgeEntry.count({ where: { userId: internalId } }),
      prisma.tasteSignal.count({ where: { userId: internalId } }),
      prisma.proactiveInsight.count({ where: { userId: internalId } }),
    ]);

    // GrowthMetric and Goal are global (no userId) — count total
    const [growthMetrics, goals] = await Promise.all([
      prisma.growthMetric.count(),
      prisma.goal.count(),
    ]);

    const daysTogether = Math.max(
      1,
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    return NextResponse.json({
      phase: 16,
      exportFormat: 'Holly Portable Relationship Format (HPRF) v1.0',
      daysTogether,
      willExport: {
        conversations,
        memories,
        milestones,
        learningGoals,
        knowledgeEntries: knowledge,
        growthMetrics,
        tasteSignals,
        goals,
        insights,
      },
      totalItems: conversations + memories + milestones + learningGoals + knowledge + growthMetrics + tasteSignals + goals + insights,
    });
  } catch (error) {
    console.error('[MemoryExport API] GET error:', error);
    return NextResponse.json({ error: 'Failed to count export data' }, { status: 500 });
  }
}
