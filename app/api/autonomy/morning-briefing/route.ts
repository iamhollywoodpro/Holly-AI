import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateMorningBriefing, persistBriefingNotification } from '@/lib/autonomy/morning-briefing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validateCronOrAuth(req: NextRequest): { dbUserId: string; clerkUserId: string } | NextResponse {
  return null as any;
}

async function resolveUserIdentity(req: NextRequest): Promise<{ dbUserId: string; clerkUserId: string } | NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const headerSecret = req.headers.get('x-cron-secret');
  const urlSecret = req.nextUrl.searchParams.get('secret');
  const provided = authHeader?.replace('Bearer ', '') ?? headerSecret ?? urlSecret;

  const isCron = cronSecret && provided === cronSecret;

  if (!isCron) {
    try {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { getOrCreateUser } = await import('@/lib/user-manager');
      const dbUser = await getOrCreateUser(userId);
      return { dbUserId: dbUser.id, clerkUserId: userId };
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const firstUser = await (await import('@/lib/db')).prisma.user.findFirst({
      select: { id: true, clerkUserId: true },
    });
    if (!firstUser) return NextResponse.json({ error: 'No users found' }, { status: 404 });
    return { dbUserId: firstUser.id, clerkUserId: firstUser.clerkUserId ?? '' };
  } catch {
    return NextResponse.json({ error: 'No users found' }, { status: 404 });
  }
}

async function runMorningBriefing(req: NextRequest) {
  const identity = await resolveUserIdentity(req);
  if (identity instanceof NextResponse) return identity;

  const { dbUserId, clerkUserId } = identity;

  try {
    const briefing = await generateMorningBriefing(dbUserId);
    await persistBriefingNotification(clerkUserId, dbUserId, briefing);

    // Send morning briefing SMS to the creator
    const creatorPhone = process.env.CREATOR_PHONE;
    if (creatorPhone) {
      try {
        const { sendSMS } = await import('@/lib/integrations/sms-service');
        // Build SMS-friendly summary from briefing fields
        const parts = [
          `☀️ Holly's Morning Briefing`,
          ``,
          briefing.greeting || '',
          briefing.overnightSummary || '',
          ``,
          `Health: ${briefing.systemHealth || 'OK'}`,
          briefing.emotionalState ? `Mood: ${briefing.emotionalState}` : '',
          briefing.activeGoals?.length ? `Goals: ${briefing.activeGoals.slice(0, 3).join(', ')}` : '',
          briefing.recommendedActions?.length ? `Next: ${briefing.recommendedActions[0]}` : '',
          ``,
          `Chat with me at holly.nexamusicgroup.com 💚`,
        ].filter(Boolean).join('\n');
        const result = await sendSMS({ to: creatorPhone, body: parts.substring(0, 800) });
        if (result.sent) {
          console.log(`[MorningBriefing] SMS sent to ${creatorPhone}`);
        } else {
          console.warn(`[MorningBriefing] SMS failed: ${result.error}`);
        }
      } catch (smsErr) {
        console.warn('[MorningBriefing] SMS dispatch error:', smsErr);
      }
    }

    return NextResponse.json({ success: true, briefing });
  } catch (err: any) {
    console.error('[MorningBriefing API] Error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runMorningBriefing(req);
}

export async function POST(req: NextRequest) {
  return runMorningBriefing(req);
}
