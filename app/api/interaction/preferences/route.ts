/**
 * GET /api/interaction/preferences
 * Get user preferences
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserPreferences } from '@/lib/interaction/user-preferences';

export const runtime = 'nodejs';


export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserPreferences(userId);

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error in get preferences API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/interaction/preferences
 * Update user preferences
 */
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { updatePreferences } = await import('@/lib/interaction/user-preferences');
    
    const result = await updatePreferences(userId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: result.preferences
    });
  } catch (error) {
    console.error('Error in update preferences API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
