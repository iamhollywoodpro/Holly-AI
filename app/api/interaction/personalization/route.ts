/**
 * GET /api/interaction/personalization
 * Get comprehensive personalization data
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPersonalization } from '@/lib/interaction/personalization-engine';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personalization = await getPersonalization(userId);

    return NextResponse.json({
      success: true,
      ...personalization
    });
  } catch (error) {
    console.error('Error in get personalization API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
