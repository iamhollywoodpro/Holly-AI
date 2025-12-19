import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db'; // CORRECTED: Uses your actual import path
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';

export const runtime = 'nodejs';


export async function GET() {
  try {
    const { userId } = await auth();
    // If no user is logged in, return default settings to prevent a 401 error.
    if (!userId) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }
    // If user is logged in, return their specific settings.
    const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    return NextResponse.json(userSettings?.settings || DEFAULT_SETTINGS);
  } catch (e) {
    // On any error, return defaults. This is the "Brain Sync" fix.
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
