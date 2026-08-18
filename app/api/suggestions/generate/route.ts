import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Suggestion engine is not implemented yet (Roadmap C4).
// Honest 504 instead of silently returning empty suggestions as if real.
export async function POST() {
  return NextResponse.json(
    { error: 'Suggestion engine not implemented' },
    { status: 504 }
  );
}
