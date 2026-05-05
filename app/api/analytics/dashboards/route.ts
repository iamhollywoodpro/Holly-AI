import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDashboards, createDashboard } from '@/lib/analytics/dashboard-builder';

export const runtime = 'nodejs';


// GET /api/analytics/dashboards - List dashboards with filters
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dashboardType = searchParams.get('dashboardType') || undefined;
    const isPublic = searchParams.get('isPublic') === 'true' ? true : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const dashboards = await getDashboards(userId, {
      dashboardType,
      isPublic,
      limit
    });

    return NextResponse.json(dashboards);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/dashboards - Create new dashboard
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.name || !body.dashboardType) {
      return NextResponse.json(
        { error: 'Name and dashboardType are required' },
        { status: 400 }
      );
    }

    const result = await createDashboard(body, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}
