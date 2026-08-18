import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

// Real test execution is not wired to the actual Jest suite.
// The previous implementation returned hardcoded fabricated results
// (125 tests / 118 passed) — removed per the no-fake-data rule.
export async function POST(req: NextRequest) {
  const adminGate = await requireAdmin();
  if (adminGate instanceof NextResponse) return adminGate;

  return NextResponse.json(
    { error: 'Test execution is not implemented — run `npx jest` for real results' },
    { status: 504 }
  );
}
