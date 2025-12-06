/**
 * POST /api/interaction/preferences/reset
 * Reset preferences to defaults
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resetPreferences } from '@/lib/interaction/user-preferences';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await resetPreferences(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences reset to defaults'
    });
  } catch (error) {
    console.error('Error in reset preferences API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
