import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { toggleDashboardFavorite } from '@/lib/analytics/dashboard-builder';

// POST /api/analytics/dashboards/[id]/favorite - Toggle dashboard favorite
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await toggleDashboardFavorite(params.id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error toggling dashboard favorite:', error);
    return NextResponse.json(
      { error: 'Failed to toggle dashboard favorite' },
      { status: 500 }
    );
  }
}
