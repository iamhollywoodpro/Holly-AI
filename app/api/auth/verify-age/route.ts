/**
 * POST /api/auth/verify-age
 * Phase Q2 — Tier 1: Self-attestation age verification
 *
 * Request body:
 *   {
 *     birthdate: "YYYY-MM-DD",  // ISO date string
 *     agreement: boolean,       // must be true — user agreed to NSFW ToS
 *     jurisdiction?: string     // optional: "US-CA", "CA-ON", etc.
 *   }
 *
 * Response:
 *   200 OK — verification stored, user.isAdult = true
 *   400 Bad Request — underage (< 18), missing fields, or agreement not accepted
 *   401 Unauthorized — not logged in
 *
 * Verification rules:
 *   - Birthdate must calculate to ≥ 18 years before today
 *   - `agreement` must be true (user accepted ToS)
 *   - Method stored as 'self_attestation'
 *
 * NOTE: This is Tier 1 (basic legal cover). Tier 2 (CC auth) and Tier 3 (Stripe
 * Identity) are reserved for pre-public-launch hardening.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { logger } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';
export const maxDuration = 10;

const MINIMUM_AGE_YEARS = 18;

/**
 * Calculate age in years from birthdate.
 * Uses calendar year difference, adjusted for whether birthday has occurred this year.
 */
export function calculateAge(birthdate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthdate.getFullYear();
  const monthDiff = now.getMonth() - birthdate.getMonth();
  const dayDiff = now.getDate() - birthdate.getDate();

  // If birthday hasn't happened yet this year, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLoadUser();
    if (!auth || !auth.userId || !auth.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Creator accounts auto-pass — no verification needed
    if (auth.isCreator) {
      // Auto-flag creator as adult (idempotent — only writes if not already set)
      await prisma.user.updateMany({
        where: { id: auth.dbUserId, isAdult: false },
        data: {
          isAdult: true,
          ageVerifiedAt: new Date(),
          ageVerificationMethod: 'creator_override',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Creator account — adult access auto-enabled.',
        method: 'creator_override',
      });
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_BODY' },
        { status: 400 },
      );
    }

    const { birthdate, agreement, jurisdiction } = body as {
      birthdate?: string;
      agreement?: boolean;
      jurisdiction?: string;
    };

    if (!birthdate) {
      return NextResponse.json(
        { error: 'Birthdate is required', code: 'BIRTHDATE_REQUIRED' },
        { status: 400 },
      );
    }

    if (agreement !== true) {
      return NextResponse.json(
        {
          error: 'You must accept the adult content terms to proceed.',
          code: 'AGREEMENT_REQUIRED',
        },
        { status: 400 },
      );
    }

    // ── Validate birthdate ──────────────────────────────────────────────────
    const parsedDate = new Date(birthdate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid birthdate format. Use YYYY-MM-DD.', code: 'INVALID_BIRTHDATE' },
        { status: 400 },
      );
    }

    // Sanity-check: birthdate can't be in the future or before 1900
    const now = new Date();
    if (parsedDate > now) {
      return NextResponse.json(
        { error: 'Birthdate cannot be in the future.', code: 'INVALID_BIRTHDATE' },
        { status: 400 },
      );
    }
    if (parsedDate.getFullYear() < 1900) {
      return NextResponse.json(
        { error: 'Birthdate is unreasonably old.', code: 'INVALID_BIRTHDATE' },
        { status: 400 },
      );
    }

    // ── Calculate age ─────────────────────────────────────────────────────────
    const age = calculateAge(parsedDate, now);
    if (age < MINIMUM_AGE_YEARS) {
      // Log attempt — useful for audit trail (underage attempt)
      logger.warn('Underage age verification attempt', {
        dbUserId: auth.dbUserId,
        age,
        jurisdiction: jurisdiction || 'unknown',
        category: 'safety',
      });

      return NextResponse.json(
        {
          error: `You must be ${MINIMUM_AGE_YEARS} or older to access adult content.`,
          code: 'UNDERAGE',
          minimumAge: MINIMUM_AGE_YEARS,
        },
        { status: 400 },
      );
    }

    // ── Store verification ───────────────────────────────────────────────────
    await prisma.user.update({
      where: { id: auth.dbUserId },
      data: {
        isAdult: true,
        ageVerifiedAt: new Date(),
        ageVerificationMethod: 'self_attestation',
        birthdate: parsedDate,
        ageVerificationDetails: {
          jurisdiction: jurisdiction || null,
          clientIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          userAgent: req.headers.get('user-agent')?.substring(0, 200) || null,
          tier: 1,
        },
      },
    });

    logger.info('Age verification completed', {
      dbUserId: auth.dbUserId,
      method: 'self_attestation',
      age,
      jurisdiction: jurisdiction || 'unknown',
      category: 'safety',
    });

    return NextResponse.json({
      success: true,
      message: 'Age verification complete. Adult features unlocked.',
      method: 'self_attestation',
      tier: 1,
    });
  } catch (error: any) {
    logger.error('Age verification failed', {
      error: error.message,
      category: 'safety',
    });
    return NextResponse.json(
      { error: 'Age verification failed', detail: error.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/verify-age
 * Returns current user's verification status (no PII — just the gate result).
 */
export async function GET() {
  try {
    const auth = await authenticateAndLoadUser();
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    if (auth.isCreator) {
      return NextResponse.json({
        isAdult: true,
        isCreator: true,
        method: 'creator_override',
        verified: true,
      });
    }

    if (!auth.dbUserId) {
      return NextResponse.json({
        isAdult: false,
        isCreator: false,
        verified: false,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.dbUserId },
      select: {
        isAdult: true,
        ageVerificationMethod: true,
        ageVerifiedAt: true,
      },
    });

    return NextResponse.json({
      isAdult: user?.isAdult ?? false,
      isCreator: false,
      method: user?.ageVerificationMethod ?? null,
      verified: user?.ageVerifiedAt !== null,
      verifyUrl: '/onboarding/age-verify',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 },
    );
  }
}
