/**
 * TemporalEngine – Phase 5 Temporal Awareness System
 *
 * Tracks temporal events, recognises patterns, generates proactive insights,
 * and provides time-aware context that can be injected into system prompts.
 */

import { prisma } from '@/lib/db';

// ─── Input types ──────────────────────────────────────────────────────────────

export interface EventInput {
  eventType:   string;
  category:    string;
  title:       string;
  description?: string;
  metadata?:    Record<string, unknown>;
  importance?:  number;
  projectRef?:  string;
  timestamp?:   Date;
  expiresAt?:   Date;
}

export interface SessionInput {
  sessionType:    string;
  topic?:         string;
  projectRef?:    string;
  conversationId?: string;
}

export interface SessionEndOpts {
  messageCount?: number;
  toolsUsed?:    string[];
  topics?:       string[];
  productivity?: number;
}

export interface RecentEventsOpts {
  eventType?:    string;
  category?:     string;
  since?:        Date;
  limit?:        number;
  minImportance?: number;
}

export interface TimelineOpts {
  from?:       Date;
  to?:         Date;
  category?:   string;
  projectRef?: string;
}

export interface PatternsOpts {
  patternType?:   string;
  minConfidence?: number;
}

export interface PendingInsightsOpts {
  limit?: number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class TemporalEngine {
  // ── Event recording ──────────────────────────────────────────────────────

  /**
   * Record a temporal event (conversation, code change, deployment, milestone, etc.)
   */
  async recordEvent(userId: string, event: EventInput) {
    try {
      return await prisma.temporalEvent.create({
        data: {
          userId,
          eventType:   event.eventType,
          category:    event.category,
          title:       event.title,
          description: event.description ?? null,
          metadata:    event.metadata ?? undefined,
          importance:  event.importance ?? 5,
          projectRef:  event.projectRef ?? null,
          timestamp:   event.timestamp ?? new Date(),
          expiresAt:   event.expiresAt ?? null,
        },
      });
    } catch (error) {
      console.error('[TemporalEngine] recordEvent failed:', error);
      throw error;
    }
  }

  /**
   * Fetch recent events with optional filters.
   */
  async getRecentEvents(userId: string, opts?: RecentEventsOpts) {
    try {
      const where: Record<string, unknown> = { userId };

      if (opts?.eventType) where.eventType = opts.eventType;
      if (opts?.category)  where.category  = opts.category;
      if (opts?.since)     where.timestamp  = { gte: opts.since };
      if (opts?.minImportance) where.importance = { gte: opts.minImportance };

      return await prisma.temporalEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: opts?.limit ?? 50,
      });
    } catch (error) {
      console.error('[TemporalEngine] getRecentEvents failed:', error);
      return [];
    }
  }

  /**
   * Get a chronologically-ordered timeline of events.
   */
  async getTimeline(userId: string, opts?: TimelineOpts) {
    try {
      const where: Record<string, unknown> = { userId };

      if (opts?.from || opts?.to) {
        where.timestamp = {
          ...(opts.from && { gte: opts.from }),
          ...(opts.to   && { lte: opts.to   }),
        };
      }
      if (opts?.category)   where.category   = opts.category;
      if (opts?.projectRef) where.projectRef = opts.projectRef;

      return await prisma.temporalEvent.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        take: 500,
      });
    } catch (error) {
      console.error('[TemporalEngine] getTimeline failed:', error);
      return [];
    }
  }

  // ── Activity sessions ────────────────────────────────────────────────────

  /**
   * Start a new activity session (coding, conversation, research, etc.)
   */
  async recordActivitySession(userId: string, session: SessionInput) {
    try {
      // Close any existing active session for this user first
      const active = await this.getActiveSession(userId);
      if (active) {
        await this.endActivitySession(active.id);
      }

      return await prisma.activitySession.create({
        data: {
          userId,
          sessionType:    session.sessionType,
          topic:          session.topic ?? null,
          projectRef:     session.projectRef ?? null,
          conversationId: session.conversationId ?? null,
          toolsUsed:      [],
          topics:         [],
        },
      });
    } catch (error) {
      console.error('[TemporalEngine] recordActivitySession failed:', error);
      throw error;
    }
  }

  /**
   * End an activity session, recording final stats.
   */
  async endActivitySession(sessionId: string, opts?: SessionEndOpts) {
    try {
      const session = await prisma.activitySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error(`Session ${sessionId} not found`);

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - session.startTime.getTime()) / 1000);

      return await prisma.activitySession.update({
        where: { id: sessionId },
        data: {
          endTime,
          duration,
          messageCount: opts?.messageCount ?? session.messageCount,
          toolsUsed:    opts?.toolsUsed ?? session.toolsUsed,
          topics:       opts?.topics ?? session.topics,
          productivity: opts?.productivity ?? null,
        },
      });
    } catch (error) {
      console.error('[TemporalEngine] endActivitySession failed:', error);
      throw error;
    }
  }

  /**
   * Get the user's current active (unclosed) session, if any.
   */
  async getActiveSession(userId: string) {
    try {
      return await prisma.activitySession.findFirst({
        where: {
          userId,
          endTime: null,
        },
        orderBy: { startTime: 'desc' },
      });
    } catch (error) {
      console.error('[TemporalEngine] getActiveSession failed:', error);
      return null;
    }
  }

  // ── Pattern detection ────────────────────────────────────────────────────

  /**
   * Analyse recent events to detect recurring temporal patterns such as
   * work-hour cycles, common topic rhythms, and tool-usage cadences.
   */
  async detectPatterns(userId: string) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const events = await prisma.temporalEvent.findMany({
        where: {
          userId,
          timestamp: { gte: thirtyDaysAgo },
        },
        orderBy: { timestamp: 'asc' },
      });

      if (events.length < 5) return [];

      const detected: Awaited<ReturnType<typeof prisma.temporalPattern.create>>[] = [];

      // 1. Work-hours pattern: cluster activity by hour-of-day
      const hourCounts = new Map<number, number>();
      for (const ev of events) {
        const h = ev.timestamp.getHours();
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
      const peakHours = [...hourCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([h]) => h);

      if (peakHours.length >= 3) {
        const total = events.length;
        const peakEvents = events.filter(e => peakHours.includes(e.timestamp.getHours())).length;
        const confidence = Math.min(peakEvents / total, 1.0);

        const dayCounts = new Map<number, number>();
        for (const ev of events) {
          const d = ev.timestamp.getDay();
          dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
        }
        const peakDays = [...dayCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([d]) => d);

        const hourRanges = peakHours.sort((a, b) => a - b);
        const pattern = await prisma.temporalPattern.upsert({
          where: {
            id: (
              await prisma.temporalPattern.findFirst({
                where: { userId, patternType: 'work_hours' },
                select: { id: true },
              })
            )?.id ?? '___none___',
          },
          update: {
            pattern: `Active roughly ${hourRanges.map(h => `${h}:00`).join(', ')}`,
            context: { peakHours, peakDays, totalEvents: total },
            confidence,
            lastSeen: now,
            peakHours: hourRanges,
            peakDays,
          },
          create: {
            userId,
            patternType: 'work_hours',
            pattern: `Active roughly ${hourRanges.map(h => `${h}:00`).join(', ')}`,
            context: { peakHours, peakDays, totalEvents: total },
            confidence,
            frequency: 'daily',
            peakHours: hourRanges,
            peakDays,
          },
        });
        detected.push(pattern);
      }

      // 2. Topic / category rhythm – which categories recur together
      const categoryBuckets = new Map<string, number>();
      for (const ev of events) {
        categoryBuckets.set(ev.category, (categoryBuckets.get(ev.category) ?? 0) + 1);
      }
      const topCategories = [...categoryBuckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (topCategories.length >= 2) {
        const dominantCategory = topCategories[0][0];
        const dominantCount = topCategories[0][1];
        const confidence = Math.min(dominantCount / events.length, 1.0);

        const existing = await prisma.temporalPattern.findFirst({
          where: { userId, patternType: 'topic_rhythm' },
        });

        const pattern = await prisma.temporalPattern.upsert({
          where: { id: existing?.id ?? '___none___' },
          update: {
            pattern: `Most active in "${dominantCategory}" (${dominantCount} events), followed by ${topCategories.slice(1).map(([c, n]) => `"${c}" (${n})`).join(', ')}`,
            context: { categories: topCategories.map(([c, n]) => ({ category: c, count: n })) },
            confidence,
            lastSeen: now,
          },
          create: {
            userId,
            patternType: 'topic_rhythm',
            pattern: `Most active in "${dominantCategory}" (${dominantCount} events), followed by ${topCategories.slice(1).map(([c, n]) => `"${c}" (${n})`).join(', ')}`,
            context: { categories: topCategories.map(([c, n]) => ({ category: c, count: n })) },
            confidence,
            frequency: 'weekly',
            peakHours: [],
            peakDays: [],
          },
        });
        detected.push(pattern);
      }

      // 3. Activity cycle – bursts of activity vs quiet periods
      const sessions = await prisma.activitySession.findMany({
        where: {
          userId,
          startTime: { gte: thirtyDaysAgo },
          endTime: { not: null },
        },
        orderBy: { startTime: 'asc' },
      });

      if (sessions.length >= 3) {
        const avgDuration = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0) / sessions.length;
        const longSessions = sessions.filter(s => (s.duration ?? 0) > avgDuration * 1.5);
        const shortSessions = sessions.filter(s => (s.duration ?? 0) < avgDuration * 0.5);

        if (longSessions.length > 0 || shortSessions.length > 0) {
          const existing = await prisma.temporalPattern.findFirst({
            where: { userId, patternType: 'activity_cycle' },
          });

          const confidence = Math.min(sessions.length / 20, 1.0);
          const pattern = await prisma.temporalPattern.upsert({
            where: { id: existing?.id ?? '___none___' },
            update: {
              pattern: `Average session ${Math.round(avgDuration / 60)}min. ${longSessions.length} deep sessions, ${shortSessions.length} brief sessions in the last 30 days.`,
              context: { avgDuration, longSessions: longSessions.length, shortSessions: shortSessions.length, totalSessions: sessions.length },
              confidence,
              lastSeen: now,
            },
            create: {
              userId,
              patternType: 'activity_cycle',
              pattern: `Average session ${Math.round(avgDuration / 60)}min. ${longSessions.length} deep sessions, ${shortSessions.length} brief sessions in the last 30 days.`,
              context: { avgDuration, longSessions: longSessions.length, shortSessions: shortSessions.length, totalSessions: sessions.length },
              confidence,
              frequency: 'weekly',
              peakHours: [],
              peakDays: [],
            },
          });
          detected.push(pattern);
        }
      }

      // 4. Tool usage cadence
      const toolCounts = new Map<string, number>();
      for (const ev of events) {
        if (ev.metadata && typeof ev.metadata === 'object') {
          const meta = ev.metadata as Record<string, unknown>;
          if (meta.tool) {
            const tool = String(meta.tool);
            toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
          }
        }
      }
      if (toolCounts.size >= 2) {
        const sortedTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]);
        const existing = await prisma.temporalPattern.findFirst({
          where: { userId, patternType: 'tool_usage' },
        });

        const confidence = Math.min(sortedTools[0][1] / events.length, 0.9);
        const pattern = await prisma.temporalPattern.upsert({
          where: { id: existing?.id ?? '___none___' },
          update: {
            pattern: `Most-used tools: ${sortedTools.slice(0, 5).map(([t, n]) => `${t} (${n}x)`).join(', ')}`,
            context: { tools: sortedTools.map(([t, n]) => ({ tool: t, count: n })) },
            confidence,
            lastSeen: now,
          },
          create: {
            userId,
            patternType: 'tool_usage',
            pattern: `Most-used tools: ${sortedTools.slice(0, 5).map(([t, n]) => `${t} (${n}x)`).join(', ')}`,
            context: { tools: sortedTools.map(([t, n]) => ({ tool: t, count: n })) },
            confidence,
            frequency: 'weekly',
            peakHours: [],
            peakDays: [],
          },
        });
        detected.push(pattern);
      }

      return detected;
    } catch (error) {
      console.error('[TemporalEngine] detectPatterns failed:', error);
      return [];
    }
  }

  /**
   * Retrieve stored patterns with optional filters.
   */
  async getPatterns(userId: string, opts?: PatternsOpts) {
    try {
      const where: Record<string, unknown> = { userId };
      if (opts?.patternType)   where.patternType = opts.patternType;
      if (opts?.minConfidence) where.confidence   = { gte: opts.minConfidence };

      return await prisma.temporalPattern.findMany({
        where,
        orderBy: { confidence: 'desc' },
      });
    } catch (error) {
      console.error('[TemporalEngine] getPatterns failed:', error);
      return [];
    }
  }

  // ── Proactive insights ───────────────────────────────────────────────────

  /**
   * Analyse temporal data and generate proactive suggestions / observations.
   */
  async generateInsights(userId: string) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const insights: Awaited<ReturnType<typeof prisma.proactiveInsight.create>>[] = [];

      // Fetch data we need
      const recentEvents = await prisma.temporalEvent.findMany({
        where: { userId, timestamp: { gte: sevenDaysAgo } },
        orderBy: { timestamp: 'desc' },
      });

      const allRecentEvents = await prisma.temporalEvent.findMany({
        where: { userId, timestamp: { gte: thirtyDaysAgo } },
        orderBy: { timestamp: 'desc' },
      });

      const sessions = await prisma.activitySession.findMany({
        where: {
          userId,
          startTime: { gte: thirtyDaysAgo },
          endTime: { not: null },
        },
        orderBy: { startTime: 'desc' },
      });

      const patterns = await this.getPatterns(userId);

      // Avoid duplicate pending insights
      const existingPending = await prisma.proactiveInsight.findMany({
        where: { userId, status: 'pending' },
        select: { title: true },
      });
      const pendingTitles = new Set(existingPending.map(i => i.title));

      // 1. Dormant project / topic detection
      const projectEvents = new Map<string, Date>();
      for (const ev of allRecentEvents) {
        if (ev.projectRef) {
          const existing = projectEvents.get(ev.projectRef);
          if (!existing || ev.timestamp > existing) {
            projectEvents.set(ev.projectRef, ev.timestamp);
          }
        }
      }
      for (const [project, lastActive] of projectEvents) {
        const daysSince = Math.round((now.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSince >= 7) {
          const title = `Project "${project}" hasn't been active in ${daysSince} days`;
          if (!pendingTitles.has(title)) {
            const insight = await prisma.proactiveInsight.create({
              data: {
                userId,
                insightType: 'reminder',
                category: 'project',
                title,
                description: `You last worked on "${project}" ${daysSince} days ago. Consider revisiting it or archiving it if it's complete.`,
                reasoning: `No events recorded for project "${project}" in ${daysSince} days`,
                priority: daysSince > 14 ? 7 : 5,
                context: { project, daysSince, lastActive: lastActive.toISOString() },
              },
            });
            insights.push(insight);
          }
        }
      }

      // 2. Productivity trend
      if (sessions.length >= 3) {
        const recent3 = sessions.slice(0, 3);
        const older3 = sessions.slice(3, 6);

        if (older3.length >= 2) {
          const recentAvg = recent3.reduce((s, sess) => s + (sess.productivity ?? 0.5), 0) / recent3.length;
          const olderAvg = older3.reduce((s, sess) => s + (sess.productivity ?? 0.5), 0) / older3.length;

          if (recentAvg < olderAvg - 0.2) {
            const title = 'Productivity appears to be declining';
            if (!pendingTitles.has(title)) {
              const insight = await prisma.proactiveInsight.create({
                data: {
                  userId,
                  insightType: 'observation',
                  category: 'productivity',
                  title,
                  description: 'Your recent sessions show lower productivity scores compared to earlier sessions. Consider taking a break or switching to a lighter task.',
                  reasoning: `Recent avg productivity: ${recentAvg.toFixed(2)} vs earlier: ${olderAvg.toFixed(2)}`,
                  priority: 6,
                  context: { recentAvg, olderAvg, recentSessions: recent3.length, olderSessions: older3.length },
                },
              });
              insights.push(insight);
            }
          } else if (recentAvg > olderAvg + 0.2) {
            const title = 'Productivity is trending upward';
            if (!pendingTitles.has(title)) {
              const insight = await prisma.proactiveInsight.create({
                data: {
                  userId,
                  insightType: 'observation',
                  category: 'productivity',
                  title,
                  description: 'Your recent sessions are more productive than usual. Great momentum! Consider tackling challenging tasks while in this flow.',
                  reasoning: `Recent avg productivity: ${recentAvg.toFixed(2)} vs earlier: ${olderAvg.toFixed(2)}`,
                  priority: 4,
                  context: { recentAvg, olderAvg },
                },
              });
              insights.push(insight);
            }
          }
        }
      }

      // 3. Time-of-day suggestion based on work-hours pattern
      const workHoursPattern = patterns.find(p => p.patternType === 'work_hours');
      if (workHoursPattern && workHoursPattern.peakHours.length > 0) {
        const currentHour = now.getHours();
        const isPeak = workHoursPattern.peakHours.includes(currentHour);
        if (!isPeak) {
          const nextPeak = workHoursPattern.peakHours
            .filter(h => h > currentHour)
            .sort((a, b) => a - b)[0] ?? workHoursPattern.peakHours.sort((a, b) => a - b)[0];
          const title = 'Outside usual active hours';
          if (!pendingTitles.has(title)) {
            const insight = await prisma.proactiveInsight.create({
              data: {
                userId,
                insightType: 'suggestion',
                category: 'workflow',
                title,
                description: `It's ${currentHour}:00 and you're usually most active around ${workHoursPattern.peakHours.sort((a, b) => a - b).map(h => `${h}:00`).join(', ')}. If you're working on something, I'm here to help!`,
                reasoning: `Current hour ${currentHour} not in peak hours ${workHoursPattern.peakHours.join(',')}`,
                priority: 3,
                context: { currentHour, peakHours: workHoursPattern.peakHours, nextPeak },
              },
            });
            insights.push(insight);
          }
        }
      }

      // 4. Category diversification nudge
      const categoryBreakdown = new Map<string, number>();
      for (const ev of recentEvents) {
        categoryBreakdown.set(ev.category, (categoryBreakdown.get(ev.category) ?? 0) + 1);
      }
      if (categoryBreakdown.size >= 1 && recentEvents.length >= 10) {
        const dominant = [...categoryBreakdown.entries()].sort((a, b) => b[1] - a[1])[0];
        const ratio = dominant[1] / recentEvents.length;
        if (ratio > 0.7 && categoryBreakdown.size < 4) {
          const title = 'Work has been concentrated in a single area';
          if (!pendingTitles.has(title)) {
            const insight = await prisma.proactiveInsight.create({
              data: {
                userId,
                insightType: 'suggestion',
                category: 'learning',
                title,
                description: `Over ${Math.round(ratio * 100)}% of your recent activity has been in "${dominant[0]}". Consider diversifying into other areas for a more balanced workflow.`,
                reasoning: `${dominant[0]} accounts for ${dominant[1]}/${recentEvents.length} events`,
                priority: 4,
                context: { dominantCategory: dominant[0], ratio, categoryBreakdown: Object.fromEntries(categoryBreakdown) },
              },
            });
            insights.push(insight);
          }
        }
      }

      // 5. Long session warning
      const activeSession = await this.getActiveSession(userId);
      if (activeSession) {
        const elapsedMin = Math.round((now.getTime() - activeSession.startTime.getTime()) / 60_000);
        if (elapsedMin >= 120) {
          const title = 'Long session in progress';
          if (!pendingTitles.has(title)) {
            const insight = await prisma.proactiveInsight.create({
              data: {
                userId,
                insightType: 'warning',
                category: 'health',
                title,
                description: `Your current ${activeSession.sessionType} session has been running for ${elapsedMin} minutes. Consider taking a short break to stay fresh.`,
                reasoning: `Session started ${elapsedMin} minutes ago`,
                priority: 8,
                context: { sessionId: activeSession.id, sessionType: activeSession.sessionType, elapsedMin },
              },
            });
            insights.push(insight);
          }
        }
      }

      return insights;
    } catch (error) {
      console.error('[TemporalEngine] generateInsights failed:', error);
      return [];
    }
  }

  /**
   * Get pending (not yet shown) insights.
   */
  async getPendingInsights(userId: string, opts?: PendingInsightsOpts) {
    try {
      const now = new Date();
      return await prisma.proactiveInsight.findMany({
        where: {
          userId,
          status: 'pending',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: { priority: 'desc' },
        take: opts?.limit ?? 10,
      });
    } catch (error) {
      console.error('[TemporalEngine] getPendingInsights failed:', error);
      return [];
    }
  }

  /**
   * Mark an insight as shown to the user.
   */
  async markInsightShown(insightId: string) {
    try {
      await prisma.proactiveInsight.update({
        where: { id: insightId },
        data: { status: 'shown', shownAt: new Date() },
      });
    } catch (error) {
      console.error('[TemporalEngine] markInsightShown failed:', error);
    }
  }

  /**
   * Mark an insight as acted on (user engaged with it).
   */
  async markInsightActedOn(insightId: string, feedback?: string) {
    try {
      await prisma.proactiveInsight.update({
        where: { id: insightId },
        data: {
          status: 'acted_on',
          actedOnAt: new Date(),
          ...(feedback && { userFeedback: feedback }),
        },
      });
    } catch (error) {
      console.error('[TemporalEngine] markInsightActedOn failed:', error);
    }
  }

  /**
   * Dismiss an insight the user isn't interested in.
   */
  async dismissInsight(insightId: string) {
    try {
      await prisma.proactiveInsight.update({
        where: { id: insightId },
        data: { status: 'dismissed' },
      });
    } catch (error) {
      console.error('[TemporalEngine] dismissInsight failed:', error);
    }
  }

  // ── Context generation ───────────────────────────────────────────────────

  /**
   * Build a human-readable temporal context string suitable for injection
   * into system prompts.
   */
  async getTemporalContext(userId: string): Promise<string> {
    try {
      const now = new Date();
      const sections: string[] = [];

      // Current time info
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      sections.push(`Current time: ${dayName} ${timeStr}`);

      // Active session
      const activeSession = await this.getActiveSession(userId);
      if (activeSession) {
        const elapsed = Math.round((now.getTime() - activeSession.startTime.getTime()) / 60_000);
        const parts = [`Active ${activeSession.sessionType} session for ${elapsed} minutes`];
        if (activeSession.topic) parts.push(`topic: ${activeSession.topic}`);
        if (activeSession.projectRef) parts.push(`project: ${activeSession.projectRef}`);
        sections.push(parts.join(', '));
      }

      // Recent activity (last 24 hours)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentEvents = await this.getRecentEvents(userId, { since: oneDayAgo, limit: 10 });
      if (recentEvents.length > 0) {
        const summary = recentEvents.slice(0, 5).map(e => {
          const ago = Math.round((now.getTime() - e.timestamp.getTime()) / (60 * 60 * 1000));
          return `${e.title} (${ago}h ago)`;
        });
        sections.push(`Recent activity: ${summary.join('; ')}`);
      }

      // Known patterns
      const patterns = await this.getPatterns(userId, { minConfidence: 0.4 });
      if (patterns.length > 0) {
        const patternDesc = patterns.slice(0, 3).map(p => p.pattern).join('. ');
        sections.push(`Patterns: ${patternDesc}`);
      }

      // Pending insights (top 3)
      const pending = await this.getPendingInsights(userId, { limit: 3 });
      if (pending.length > 0) {
        const insightDesc = pending.map(i => `${i.title} [${i.insightType}]`).join('; ');
        sections.push(`Pending insights: ${insightDesc}`);
      }

      return sections.length > 1
        ? `[Temporal Context]\n${sections.join('\n')}`
        : '';
    } catch (error) {
      console.error('[TemporalEngine] getTemporalContext failed:', error);
      return '';
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  /**
   * Remove expired events and insights. If userId is provided, only clean
   * that user's data; otherwise clean everything.
   * Returns the total number of records deleted.
   */
  async cleanupExpired(userId?: string): Promise<number> {
    try {
      const now = new Date();
      const baseWhere = {
        expiresAt: { not: null, lt: now },
        ...(userId && { userId }),
      };

      const [deletedEvents, deletedInsights] = await Promise.all([
        prisma.temporalEvent.deleteMany({
          where: { ...baseWhere, expiresAt: { lt: now } },
        }),
        prisma.proactiveInsight.deleteMany({
          where: { ...baseWhere, expiresAt: { lt: now } },
        }),
      ]);

      // Also mark expired insights (with status pending/shown) as expired
      const expiredInsights = await prisma.proactiveInsight.updateMany({
        where: {
          ...(userId && { userId }),
          status: { in: ['pending', 'shown'] },
          expiresAt: { lt: now },
        },
        data: { status: 'expired' },
      });

      return deletedEvents.count + deletedInsights.count + expiredInsights.count;
    } catch (error) {
      console.error('[TemporalEngine] cleanupExpired failed:', error);
      return 0;
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const temporalEngine = new TemporalEngine();
