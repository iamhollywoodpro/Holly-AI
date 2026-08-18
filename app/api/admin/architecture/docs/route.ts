import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

// Real documentation generation is not implemented.
// The previous implementation returned a hardcoded fake API doc describing
// endpoints that don't exist — removed per the no-fake-data rule.
export async function POST(req: NextRequest) {
  const adminGate = await requireAdmin();
  if (adminGate instanceof NextResponse) return adminGate;

  return NextResponse.json(
    { error: 'Documentation generation is not implemented' },
    { status: 504 }
  );
}
