/**
 * /chat — server-side gate (Phase Q3 Gap 1)
 * ──────────────────────────────────────────
 * Three checks BEFORE any client JS loads:
 *   1. Authenticated (Clerk userId present)        → else /sign-in
 *   2. User record exists in DB                    → else /sign-in
 *   3. Age-verified adult OR recognized creator    → else /onboarding/age-verify
 *
 * This is the FRONT DOOR for Holly. New users cannot reach the chat
 * interface until they have completed Tier 1 age verification. The
 * creator (Steve) auto-bypasses via the hardcoded email/name recognition
 * in src/lib/chat/auth.ts.
 *
 * The actual chat UI + Clerk session race-condition handling lives in
 * the ChatClient client component (src/components/chat/ChatClient.tsx).
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { needsOnboarding } from '@/lib/onboarding/onboarding-engine';
import ChatClient from '@/components/chat/ChatClient';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const { userId } = await auth();

  // ── Gate 1: Must be authenticated ──────────────────────────────────────
  if (!userId) {
    redirect('/sign-in');
  }

  // ── authenticateAndLoadUser handles creator recognition + persistent flags ──
  // Returns { isCreator, dbUserId, ... } — creator auto-bypasses age verify.
  const authResult = await authenticateAndLoadUser();

  if (!authResult || !authResult.userId) {
    redirect('/sign-in');
  }

  // ── Gate 2: DB record must exist ───────────────────────────────────────
  if (!authResult.dbUserId) {
    redirect('/sign-in');
  }

  // ── Gate 3: Creator bypass — Steve and other recognized creators skip ──
  if (authResult.isCreator) {
    return <ChatClient />;
  }

  // ── Gate 4: Age verification required ──────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: authResult.dbUserId },
    select: {
      isAdult: true,
      ageVerificationMethod: true,
      ageVerifiedAt: true,
    },
  });

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isAdult) {
    // Not verified — send to the age verification page (no skip button anymore).
    redirect('/onboarding/age-verify?redirect=/chat');
  }

  // ── Gate 5: Onboarding (Roadmap C1, 2026-08-12) ────────────────────────
  // New users must pass through the onboarding flow (age verify → Drive →
  // partner mode) before reaching chat. The flow marks completion in the DB
  // on finish OR skip, so this never loops. Creator bypassed at Gate 3.
  if (await needsOnboarding(authResult.dbUserId)) {
    redirect('/onboarding');
  }

  // ── All gates passed — render the chat client ──────────────────────────
  return <ChatClient />;
}
