/**
 * GET   /api/settings  — return user settings (falls back to defaults)
 * POST  /api/settings  — replace full settings blob (used by settings-store)
 * PATCH /api/settings  — merge partial settings update
 *
 * Phase 6A: PATCH now handles partnerTier + partnerPreferences (devStack,
 * devFocus, lifeGoals, lifeHabits, creativeMedia, creativeStyle) and stores
 * them under settings.partner so getIdentityContext can inject them into the
 * system prompt.
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ settings: DEFAULT_SETTINGS });

    const dbUser = await getOrCreateUser(userId);
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: dbUser.id },
    });
    // Return { settings: ... } shape so Zustand store's data.settings merge works
    const saved = (userSettings?.settings as Record<string, any>) || DEFAULT_SETTINGS;
    return NextResponse.json({ settings: saved });
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

// ─── POST — full settings replace (used by Zustand settings-store) ────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);
    const body = await req.json();

    // Body shape: { settings: HollySettings } OR flat settings object
    const newSettings = body.settings ?? body;

    // Merge on top of defaults so we never lose unrecognised keys
    const merged = { ...DEFAULT_SETTINGS, ...(newSettings as Record<string, any>) };

    await prisma.userSettings.upsert({
      where:  { userId: dbUser.id },
      create: { userId: dbUser.id, settings: merged },
      update: { settings: merged },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Settings POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);
    const body = await req.json();

    // ── Separate partner fields from standard settings fields ─────────────────
    const {
      partnerTier,
      partnerPreferences,
      primaryMode,
      // remaining keys go into standard settings blob
      ...standardUpdates
    } = body;

    // Build the partner block (Phase 6A)
    const partnerBlock = partnerTier
      ? {
          tier: partnerTier,
          preferences: partnerPreferences || {},
          setAt: new Date().toISOString(),
        }
      : undefined;

    // Load existing settings, merge on top
    const existing = await prisma.userSettings.findUnique({
      where: { userId: dbUser.id },
      select: { settings: true },
    });

    const current = (existing?.settings as Record<string, any>) || DEFAULT_SETTINGS;

    const merged: Record<string, any> = {
      ...current,
      ...standardUpdates,
    };

    // Inject partner block at top level of settings JSON
    if (partnerBlock) {
      merged.partner = partnerBlock;
    }

    // primaryMode is stored as a convenience alias inside partner
    if (primaryMode) {
      merged.partner = merged.partner || {};
      merged.partner.primaryMode = primaryMode;
    }

    await prisma.userSettings.upsert({
      where: { userId: dbUser.id },
      create: { userId: dbUser.id, settings: merged },
      update: { settings: merged },
    });

    return NextResponse.json({ ok: true, saved: { partnerTier, partnerPreferences, primaryMode } });
  } catch (err) {
    console.error('[Settings PATCH]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
