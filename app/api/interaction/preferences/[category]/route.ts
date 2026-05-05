/**
 * GET /api/interaction/preferences/:category
 * Get preferences by category
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPreferencesByCategory } from '@/lib/interaction/user-preferences';

export const runtime = 'nodejs';


export async function GET(
  req: Request,
  { params }: { params: { category: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category } = params;

    const validCategories = ['ui', 'dashboard', 'notifications', 'content', 'features'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const preferences = await getPreferencesByCategory(
      userId,
      category as 'ui' | 'dashboard' | 'notifications' | 'content' | 'features'
    );

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
      preferences
    });
  } catch (error) {
    console.error('Error in get preferences by category API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
