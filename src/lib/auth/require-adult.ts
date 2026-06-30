/**
 * Phase Q2: Age Verification Gate
 * ─────────────────────────────────
 * Single source of truth for NSFW content access.
 *
 * Used by every NSFW-touching route:
 *   - Image gen (NSFW tier)
 *   - Video gen (NSFW tier — when built)
 *   - Marketplace NSFW extension install
 *   - Intimate suite routes
 *
 * Verification tiers (see Phase Q2 plan):
 *   Tier 1 (current):  Self-attestation — birthdate + legal terms
 *   Tier 2 (pre-launch): Credit card $0 auth
 *   Tier 3 (public):    Stripe Identity / Persona
 *
 * Creator accounts (hardcoded in src/lib/chat/auth.ts) ALWAYS bypass — they
 * are auto-flagged adult via the auth flow.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateAndLoadUser } from '@/lib/chat/auth';

export interface AdultAuthResult {
  userId: string;
  dbUserId: string;
  isCreator: boolean;
  isAdult: boolean;
}

export type AdultGateResult = AdultAuthResult | NextResponse;

/**
 * Verify caller is authenticated AND age-verified adult (or creator).
 *
 * Usage:
 *   const gate = await requireAdult();
 *   if (gate instanceof NextResponse) return gate;  // 401/403/404
 *   // ... proceed with NSFW logic, gate.dbUserId available
 */
export async function requireAdult(): Promise<AdultGateResult> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await authenticateAndLoadUser();
  if (!auth || !auth.userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  // Creator bypass — Steve and any future creator accounts skip age verification.
  // Creator emails are hardcoded in src/lib/chat/auth.ts.
  if (auth.isCreator) {
    return {
      userId: auth.userId,
      dbUserId: auth.dbUserId || '',
      isCreator: true,
      isAdult: true,
    };
  }

  // ── DB lookup for isAdult flag ────────────────────────────────────────────
  if (!auth.dbUserId) {
    return NextResponse.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.dbUserId },
    select: {
      isAdult: true,
      ageVerificationMethod: true,
      ageVerifiedAt: true,
      birthdate: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 },
    );
  }

  if (!user.isAdult) {
    return NextResponse.json(
      {
        error: 'Adult verification required to access this content.',
        code: 'AGE_VERIFICATION_REQUIRED',
        verifyUrl: '/onboarding/age-verify',
      },
      { status: 403 },
    );
  }

  return {
    userId: auth.userId,
    dbUserId: auth.dbUserId,
    isCreator: false,
    isAdult: true,
  };
}

/**
 * Soft check — returns whether user is adult without throwing/responding.
 * Use for filtering (e.g. marketplace browse) where you just want to skip NSFW items.
 */
export async function isUserAdult(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  const auth = await authenticateAndLoadUser();
  if (!auth) return false;
  if (auth.isCreator) return true;
  if (!auth.dbUserId) return false;

  const user = await prisma.user.findUnique({
    where: { id: auth.dbUserId },
    select: { isAdult: true },
  });

  return user?.isAdult === true;
}
