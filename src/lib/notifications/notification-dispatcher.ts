/**
 * Phase 15: REAL-TIME PROACTIVE NOTIFICATIONS
 *
 * Bridges Holly's proactive intelligence to actual push delivery:
 * - SSE push (instant, when user is online)
 * - Browser push (Web Push API, when user is offline but subscribed)
 * - Email digest (batched, daily summary)
 *
 * The proactive engine GENERATES insights. This module DELIVERS them.
 */

import { prisma } from '@/lib/db';
import { sseManager } from '@/lib/realtime/sse-manager';

// ─── Types ────────────────────────────────────────────────────────────────

interface DeliverableNotification {
  userId: string;
  clerkUserId: string;
  title: string;
  body: string;
  type: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  actionUrl?: string;
  sourceId?: string;
  metadata?: Record<string, any>;
}

interface NotificationPreferences {
  proactiveInsights: boolean;
  morningBriefing: boolean;
  studyUpdates: boolean;
  goalReminders: boolean;
  emailDigest: boolean;
  browserPush: boolean;
  quietHoursStart: number; // 0-23
  quietHoursEnd: number;   // 0-23
}

// ─── Notification Dispatcher ──────────────────────────────────────────────

class NotificationDispatcher {
  private webPushEnabled: boolean;

  constructor() {
    this.webPushEnabled = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }

  /**
   * Main dispatch method — sends notification through all appropriate channels
   */
  async dispatch(notification: DeliverableNotification): Promise<{
    sse: boolean;
    browserPush: boolean;
    persisted: boolean;
  }> {
    const prefs = await this.getUserPreferences(notification.clerkUserId);

    // Check quiet hours
    if (this.isQuietHours(prefs)) {
      console.log(`[NotificationDispatcher] Quiet hours active for ${notification.userId}, queuing`);
      // Still persist, just don't push
      await this.persistNotification(notification);
      return { sse: false, browserPush: false, persisted: true };
    }

    const results = {
      sse: false,
      browserPush: false,
      persisted: false,
    };

    // 1. Persist notification to database
    await this.persistNotification(notification);
    results.persisted = true;

    // 2. SSE push (instant, if user is online)
    if (sseManager.isUserConnected(notification.userId)) {
      const sent = sseManager.sendNotification(
        notification.userId,
        notification.title,
        notification.body,
        notification.priority === 'critical' ? 'high' : notification.priority === 'high' ? 'medium' : 'low'
      );
      results.sse = sent > 0;
      console.log(`[NotificationDispatcher] SSE delivered to ${notification.userId}: ${sent} connections`);
    }

    // 3. Browser push (if user is offline but subscribed)
    if (!results.sse && prefs.browserPush && this.webPushEnabled) {
      const pushed = await this.sendBrowserPush(notification);
      results.browserPush = pushed;
    }

    return results;
  }

  /**
   * Dispatch pending proactive insights for a user
   */
  async dispatchPendingInsights(userId: string): Promise<number> {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, clerkUserId: true },
    });
    if (!user?.clerkUserId) return 0;

    const pendingInsights = await prisma.proactiveInsight.findMany({
      where: {
        userId,
        status: 'pending',
        expiresAt: { gte: new Date() },
      },
      orderBy: [
        { urgency: 'desc' },
        { confidence: 'desc' },
      ],
      take: 3, // Don't spam — max 3 at a time
    });

    let dispatched = 0;

    for (const insight of pendingInsights) {
      // Only push high/medium urgency insights
      if (insight.urgency === 'low') continue;

      await this.dispatch({
        userId,
        clerkUserId: user.clerkUserId,
        title: insight.title,
        body: insight.body.substring(0, 300),
        type: 'proactive_insight',
        category: insight.category,
        priority: this.mapUrgencyToPriority(insight.urgency),
        sourceId: insight.id,
        metadata: {
          insightType: insight.type,
          confidence: insight.confidence,
          suggestedAction: insight.suggestedAction,
        },
      });

      // Mark insight as shown
      await prisma.proactiveInsight.update({
        where: { id: insight.id },
        data: { status: 'shown', shownAt: new Date() },
      });

      dispatched++;
    }

    return dispatched;
  }

  /**
   * Dispatch a study session completion notification
   */
  async dispatchStudyComplete(userId: string, topic: string, insightsCount: number): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, clerkUserId: true },
    });
    if (!user?.clerkUserId) return;

    const prefs = await this.getUserPreferences(user.clerkUserId);
    if (!prefs.studyUpdates) return;

    await this.dispatch({
      userId,
      clerkUserId: user.clerkUserId,
      title: `Holly studied ${topic}`,
      body: `While you were away, Holly researched ${topic} and found ${insightsCount} new insights. Ask about it next time you chat!`,
      type: 'study_update',
      category: 'learning',
      priority: 'low',
      metadata: { topic, insightsCount },
    });
  }

  /**
   * Dispatch morning briefing via SSE or browser push
   */
  async dispatchMorningBriefing(userId: string, summary: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, clerkUserId: true },
    });
    if (!user?.clerkUserId) return;

    const prefs = await this.getUserPreferences(user.clerkUserId);
    if (!prefs.morningBriefing) return;

    if (sseManager.isUserConnected(userId)) {
      sseManager.sendMorningBriefing(userId, summary);
    } else if (prefs.browserPush && this.webPushEnabled) {
      await this.sendBrowserPush({
        userId,
        clerkUserId: user.clerkUserId,
        title: 'Your morning briefing is ready',
        body: summary.substring(0, 200) + '...',
        type: 'morning_briefing',
        category: 'briefing',
        priority: 'high',
      });
    }
  }

  /**
   * Generate and send email digest for a user
   */
  async sendEmailDigest(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, clerkUserId: true, email: true, name: true },
    });
    if (!user?.clerkUserId || !user?.email) return false;

    const prefs = await this.getUserPreferences(user.clerkUserId);
    if (!prefs.emailDigest) return false;

    // Gather digest content
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pendingInsights,
      recentGoals,
      milestones,
    ] = await Promise.all([
      prisma.proactiveInsight.findMany({
        where: { userId, status: 'pending', createdAt: { gte: since } },
        orderBy: { urgency: 'desc' },
        take: 5,
      }),
      prisma.learningGoal.findMany({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.relationshipMilestone.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    // Skip if nothing to report
    if (pendingInsights.length === 0 && milestones.length === 0) {
      return false;
    }

    // Build digest
    const userName = user.name || 'there';
    const sections: string[] = [];
    sections.push(`Hi ${userName}, here's what Holly has been up to:\n`);

    if (pendingInsights.length > 0) {
      sections.push('INSIGHTS FOR YOU');
      for (const i of pendingInsights) {
        sections.push(`- ${i.title}: ${i.body.substring(0, 100)}`);
      }
      sections.push('');
    }

    if (recentGoals.length > 0) {
      sections.push('ACTIVE LEARNING GOALS');
      for (const g of recentGoals) {
        sections.push(`- ${g.topic} (${g.status}, ${g.priority} priority)`);
      }
      sections.push('');
    }

    if (milestones.length > 0) {
      sections.push('MILESTONES');
      for (const m of milestones) {
        sections.push(`- ${m.title}`);
      }
    }

    sections.push('\nLog in to chat with Holly: https://holly.nexamusicgroup.com');

    const digestContent = sections.join('\n');

    // Persist as email notification record
    await prisma.notification.create({
      data: {
        type: 'email_digest',
        title: `Holly's Daily Digest — ${new Date().toLocaleDateString()}`,
        message: digestContent,
        category: 'digest',
        priority: 'low',
        channels: ['email'],
        deliveredVia: ['email'],
        userId: user.id,
        clerkUserId: user.clerkUserId,
        status: 'read', // Email is "delivered" not "unread"
        sentAt: new Date(),
      },
    });

    // In production, integrate with Resend/SendGrid here
    // For now, we persist the digest notification and it can be sent
    // via the email integration route or a future email provider
    console.log(`[NotificationDispatcher] Email digest generated for ${userId}: ${digestContent.length} chars`);

    return true;
  }

  // ─── Browser Push ──────────────────────────────────────────────────────

  /**
   * Send a browser push notification via Web Push API
   */
  private async sendBrowserPush(notification: DeliverableNotification): Promise<boolean> {
    if (!this.webPushEnabled) return false;

    try {
      // Get user's push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: notification.userId, active: true },
      });

      if (subscriptions.length === 0) return false;

      // Lazy-load web-push only when needed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webPush = require('web-push');
      webPush.setVapidDetails(
        'mailto:holly@nexamusicgroup.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: '/holly-avatar.png',
        badge: '/holly-badge.png',
        tag: `holly-${notification.type}`,
        data: {
          url: notification.actionUrl || '/chat',
          type: notification.type,
          sourceId: notification.sourceId,
        },
      });

      let sent = 0;
      for (const sub of subscriptions) {
        try {
          await webPush.default.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          // Subscription expired or invalid
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { active: false },
            });
          }
        }
      }

      console.log(`[NotificationDispatcher] Browser push sent to ${notification.userId}: ${sent}/${subscriptions.length}`);
      return sent > 0;
    } catch (err) {
      console.error('[NotificationDispatcher] Browser push error:', err);
      return false;
    }
  }

  /**
   * Register a browser push subscription
   */
  async registerPushSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<boolean> {
    try {
      // Deactivate existing subscriptions with same endpoint
      await prisma.pushSubscription.updateMany({
        where: { userId, endpoint: subscription.endpoint },
        data: { active: false },
      });

      // Create new active subscription
      await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          active: true,
        },
      });

      return true;
    } catch (err) {
      console.error('[NotificationDispatcher] Push subscription registration error:', err);
      return false;
    }
  }

  // ─── Persistence ───────────────────────────────────────────────────────

  private async persistNotification(notification: DeliverableNotification): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          type: notification.type,
          title: notification.title,
          message: notification.body,
          category: notification.category,
          priority: notification.priority,
          channels: ['web'],
          userId: notification.userId,
          clerkUserId: notification.clerkUserId,
          status: 'unread',
          actionUrl: notification.actionUrl,
          metadata: notification.metadata || {},
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.error('[NotificationDispatcher] Persist notification error:', err);
    }
  }

  // ─── Preferences ───────────────────────────────────────────────────────

  async getUserPreferences(clerkUserId: string): Promise<NotificationPreferences> {
    const defaults: NotificationPreferences = {
      proactiveInsights: true,
      morningBriefing: true,
      studyUpdates: true,
      goalReminders: true,
      emailDigest: true,
      browserPush: true,
      quietHoursStart: 23,
      quietHoursEnd: 7,
    };

    try {
      // Look up internal userId from clerkUserId
      const user = await prisma.user.findFirst({
        where: { clerkUserId },
        select: { id: true },
      });
      if (!user) return defaults;

      const stored = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

      if (stored?.settings && typeof stored.settings === 'object') {
        const settings = stored.settings as Record<string, any>;
        if (settings.notificationPreferences) {
          return { ...defaults, ...(settings.notificationPreferences as Partial<NotificationPreferences>) };
        }
      }
    } catch { /* UserSettings may not exist yet */ }

    return defaults;
  }

  async setUserPreferences(clerkUserId: string, prefs: Partial<NotificationPreferences>): Promise<void> {
    // Look up internal userId from clerkUserId
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return;

    const current = await this.getUserPreferences(clerkUserId);
    const merged = { ...current, ...prefs };

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        settings: { notificationPreferences: merged },
      },
      create: {
        userId: user.id,
        settings: { notificationPreferences: merged },
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private isQuietHours(prefs: NotificationPreferences): boolean {
    const hour = new Date().getHours();
    if (prefs.quietHoursStart > prefs.quietHoursEnd) {
      // Crosses midnight (e.g., 23-7)
      return hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd;
    } else {
      return hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd;
    }
  }

  private mapUrgencyToPriority(urgency: string): 'low' | 'normal' | 'high' | 'critical' {
    switch (urgency) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'normal';
      default: return 'low';
    }
  }
}

// Singleton instance
export const notificationDispatcher = new NotificationDispatcher();
