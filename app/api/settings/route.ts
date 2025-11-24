import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';
import { getOrCreateUser } from '@/lib/user-manager';

// GET /api/settings - Load user settings
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database user ID from Clerk ID
    const user = await getOrCreateUser(clerkUserId);

    // Find user settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!userSettings) {
      // Return defaults if no settings exist
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

    return NextResponse.json({ settings: userSettings.settings });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// POST /api/settings - Save user settings
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { settings } = await req.json();

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 });
    }

    // Get database user ID from Clerk ID
    const user = await getOrCreateUser(clerkUserId);

    // Upsert user settings
    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        settings,
      },
      update: {
        settings,
      },
    });

    return NextResponse.json({ success: true, settings: updated.settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
