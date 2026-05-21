import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { generateRenderingContext, getOrCreateVisualIdentity } from '@/lib/visual/visual-identity-engine';

/**
 * GET /api/visual-identity/render
 * Get a full rendering context for Holly's visual identity — CSS vars,
 * gradients, keyframes, particles, and form config ready for the frontend.
 */
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const state = await getOrCreateVisualIdentity(user.id);
  const rendering = generateRenderingContext(state);

  return NextResponse.json({
    state,
    rendering,
  });
}
