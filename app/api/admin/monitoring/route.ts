// ─────────────────────────────────────────────────────────────────────────────
// Admin Monitoring Dashboard API — Comprehensive view of Holly's autonomous systems
// Phase 7.2: Dashboard for consciousness, self-code, goals, learning, health
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { monitoringEngine } from '@/lib/autonomy/monitoring-engine';

export const dynamic = 'force-dynamic';

// ─── GET /api/admin/monitoring ────────────────────────────────────────────────
// Returns comprehensive monitoring data for Holly's autonomous activities
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get('section') || 'all';

    const response: Record<string, any> = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      uptimeHuman: formatUptime(process.uptime()),
    };

    // ── System Health ──────────────────────────────────────────────────────
    if (section === 'all' || section === 'health') {
      const metrics = await monitoringEngine.runAllChecks().catch(() => null);
      const activeAlerts = monitoringEngine.getActiveAlerts();
      const overallHealth = monitoringEngine.getOverallHealth();
      const mem = process.memoryUsage();

      response.health = {
        overall: overallHealth,
        subsystems: metrics?.subsystems ?? {},
        activeAlerts: activeAlerts.length,
        alerts: activeAlerts.slice(0, 20),
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024),
          externalMB: Math.round(mem.external / 1024 / 1024),
          heapUtilization: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1) + '%',
        },
        metrics: metrics ? {
          avgResponseTime: Math.round(metrics.avgResponseTime) + 'ms',
          errorRate: (metrics.errorRate * 100).toFixed(1) + '%',
          subsystemCount: Object.keys(metrics.subsystems).length,
        } : null,
      };
    }

    // ── Consciousness Activity ─────────────────────────────────────────────
    if (section === 'all' || section === 'consciousness') {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        recentLearningEvents,
        evolutionProposals,
        identitySnapshots,
        emotionalEvents,
      ] = await Promise.all([
        prisma.learningEvent.findMany({
          where: { timestamp: { gte: last24h } },
          select: { type: true, timestamp: true, data: true },
          orderBy: { timestamp: 'desc' },
          take: 50,
        }).catch(() => []),

        prisma.evolutionProposal.findMany({
          where: { status: { in: ['proposed', 'approved', 'applied'] } },
          select: { title: true, status: true, risk: true, proposedAt: true },
          orderBy: { proposedAt: 'desc' },
          take: 20,
        }).catch(() => []),

        prisma.hollyIdentity.findMany({
          where: { updatedAt: { gte: last7d } },
          select: { updatedAt: true, personalityTraits: true, coreValues: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }).catch(() => []),

        prisma.learningEvent.findMany({
          where: {
            type: 'emotion',
            timestamp: { gte: last24h },
          },
          select: { data: true, timestamp: true },
          orderBy: { timestamp: 'desc' },
          take: 30,
        }).catch(() => []),
      ]);

      // Aggregate learning event types
      const eventTypeCounts: Record<string, number> = {};
      for (const event of recentLearningEvents) {
        eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
      }

      response.consciousness = {
        learningEvents24h: recentLearningEvents.length,
        learningEventTypes: eventTypeCounts,
        evolutionProposals: evolutionProposals.map((e: any) => ({
          title: e.title,
          status: e.status,
          risk: e.risk,
          proposedAt: e.proposedAt,
        })),
        identitySnapshots: identitySnapshots.length,
        emotionalEvents24h: emotionalEvents.length,
        recentEmotions: emotionalEvents
          .slice(0, 10)
          .map((e: any) => ({
            emotion: (e.data as any)?.emotion || 'unknown',
            intensity: (e.data as any)?.intensity || 0,
            timestamp: e.timestamp,
          })),
      };
    }

    // ── Self-Code Activity ─────────────────────────────────────────────────
    if (section === 'all' || section === 'selfcode') {
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const selfCodeActivity = await prisma.selfImprovement.findMany({
        where: {
          triggerType: { in: ['self_code', 'git_commit', 'consciousness_cycle'] },
          createdAt: { gte: last7d },
        },
        select: {
          triggerType: true,
          status: true,
          problemStatement: true,
          outcome: true,
          filesChanged: true,
          createdAt: true,
          riskLevel: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }).catch(() => []);

      const selfCodeStats = {
        total: selfCodeActivity.length,
        successful: selfCodeActivity.filter((s: any) => s.outcome === 'success').length,
        failed: selfCodeActivity.filter((s: any) => s.outcome === 'failed' || s.status === 'failed').length,
        deployed: selfCodeActivity.filter((s: any) => s.status === 'deployed').length,
        filesModified: [...new Set(selfCodeActivity.flatMap((s: any) => (s.filesChanged as string[]) || []))],
      };

      response.selfCode = {
        stats: selfCodeStats,
        recentActivity: selfCodeActivity.slice(0, 15).map((s: any) => ({
          type: s.triggerType,
          status: s.status,
          description: s.problemStatement?.substring(0, 100),
          outcome: s.outcome,
          risk: s.riskLevel,
          files: s.filesChanged,
          timestamp: s.createdAt,
        })),
      };
    }

    // ── Goals & Autonomy ───────────────────────────────────────────────────
    if (section === 'all' || section === 'goals') {
      const goals = await prisma.hollyGoal.findMany({
        where: { status: 'active' },
        select: {
          title: true,
          category: true,
          priority: true,
          progress: true,
          deadline: true,
          status: true,
        },
        orderBy: { priority: 'desc' },
        take: 20,
      }).catch(() => []);

      response.goals = {
        active: goals.length,
        goals: goals.map((g: any) => ({
          title: g.title,
          category: g.category,
          priority: g.priority,
          progress: g.progress ? Math.round(g.progress * 100) + '%' : '0%',
          deadline: g.deadline,
        })),
      };
    }

    // ── User Engagement ────────────────────────────────────────────────────
    if (section === 'all' || section === 'engagement') {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [messages24h, messages7d, messages30d, conversations24h, totalUsers] = await Promise.all([
        prisma.message.count({ where: { createdAt: { gte: last24h } } }).catch(() => 0),
        prisma.message.count({ where: { createdAt: { gte: last7d } } }).catch(() => 0),
        prisma.message.count({ where: { createdAt: { gte: last30d } } }).catch(() => 0),
        prisma.conversation.count({ where: { createdAt: { gte: last24h } } }).catch(() => 0),
        prisma.user.count().catch(() => 0),
      ]);

      response.engagement = {
        messages24h,
        messages7d,
        messages30d,
        conversations24h,
        totalUsers,
        avgMessagesPerDay30d: messages30d > 0 ? Math.round(messages30d / 30) : 0,
      };
    }

    // ── Autonomous Actions Log ─────────────────────────────────────────────
    if (section === 'all' || section === 'activity') {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const autonomousActions = await prisma.selfImprovement.findMany({
        where: { createdAt: { gte: last24h } },
        select: {
          triggerType: true,
          problemStatement: true,
          solutionApproach: true,
          outcome: true,
          riskLevel: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).catch(() => []);

      response.activity = {
        totalActions24h: autonomousActions.length,
        actions: autonomousActions.map((a: any) => ({
          type: a.triggerType,
          description: a.problemStatement?.substring(0, 120),
          approach: a.solutionApproach?.substring(0, 80),
          outcome: a.outcome,
          risk: a.riskLevel,
          timestamp: a.createdAt,
        })),
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[AdminMonitoring] Error:', error);
    return NextResponse.json(
      { error: 'Monitoring fetch failed', details: error.message },
      { status: 500 },
    );
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}
