import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CriticalAlert {
  issue: string;
  severity: 'total_failure' | 'security_pr' | 'data_loss_risk';
  details?: string;
  prUrl?: string;
}

const VALID_TRIGGERS = [
  'database_down',
  'tts_offline',
  'all_llm_providers_failed',
  'diagnostic_critical',
  'security_vulnerability_pr',
  'data_corruption_detected',
  'auth_system_failure',
];

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const internalToken = req.headers.get('x-holly-internal');

  if (cronSecret && internalToken !== cronSecret) {
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body: CriticalAlert = await req.json();
    const { issue, severity, details, prUrl } = body;

    if (!issue) {
      return NextResponse.json({ error: 'issue required' }, { status: 400 });
    }

    const message = prUrl
      ? `HOLLY Critical Alert: ${issue}. Security PR requires review: ${prUrl}`
      : `HOLLY Critical Alert: ${issue}. Check dashboard immediately.${details ? ` ${details}` : ''}`;

    const admins = await prisma.user.findMany({
      take: 3,
      select: { id: true, clerkUserId: true },
    });

    const notifications = [];
    for (const admin of admins) {
      const notif = await prisma.notification.create({
        data: {
          type: 'critical_alert',
          title: `HOLLY Critical Alert: ${severity}`,
          message,
          category: 'critical_push',
          priority: 'high',
          status: 'unread',
          userId: admin.id,
          clerkUserId: admin.clerkUserId ?? '',
          actionData: { issue, severity, details, prUrl, timestamp: new Date().toISOString() },
        },
      });
      notifications.push(notif.id);
    }

    if (process.env.CRITICAL_PUSH_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRITICAL_PUSH_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message, severity, timestamp: new Date().toISOString() }),
        });
      } catch (webhookErr) {
        console.error('[CriticalPush] Webhook delivery failed:', webhookErr);
      }
    }

    console.log(`[CriticalPush] Alert sent: ${issue} (${severity}) — ${notifications.length} recipients`);

    return NextResponse.json({
      success: true,
      message: `Critical alert dispatched to ${notifications.length} admins`,
      notificationIds: notifications,
    });
  } catch (err: any) {
    console.error('[CriticalPush] Error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
