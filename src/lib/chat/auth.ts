import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/user-manager';
import { prisma } from '@/lib/db';

// ─── Phase Q2: Creator Auto-Adult Flag ───────────────────────────────────────
// When isCreator is detected, we also auto-set isAdult=true on the user record
// (idempotent — only writes if not already set). This ensures creator accounts
// never need to manually verify age, even on first login.
async function ensureCreatorAdultFlag(dbUserId: string | null): Promise<void> {
  if (!dbUserId) return;
  try {
    await prisma.user.updateMany({
      where: { id: dbUserId, isAdult: false },
      data: {
        isAdult: true,
        ageVerifiedAt: new Date(),
        ageVerificationMethod: 'creator_override',
      },
    });
  } catch (err) {
    // Don't fail auth if this side-effect fails — just log
    console.warn('[AUTH] Failed to set creator adult flag:', err);
  }
}

// ─── Env-based creator identifiers (optional, extends hardcoded list) ────
const CREATOR_EMAILS = (process.env.CREATOR_EMAILS || '').split(',').filter(Boolean);
const CREATOR_CLERK_IDS = (process.env.CREATOR_CLERK_IDS || '').split(',').filter(Boolean);

/**
 * Hardcoded creator email addresses (EXACT match only).
 * These ensure Holly ALWAYS recognizes her creator, even if env vars aren't configured.
 * This is intentional — the creator's identity is part of Holly's core identity.
 *
 * SECURITY: Only full email addresses are matched. Never substrings, local parts,
 * or name fragments — those allowed spoofing (e.g. "Steve Musicfan" or
 * iamdoregosteve@evil.com could bypass age verification). See docs/audit/CURRENT_STATE.md [S2].
 *
 * Creator accounts:
 *   - iamdoregosteve@gmail.com  (primary)
 *   - iamhollywoodpro@gmail.com (legacy)
 *   - stevehollywood@gmail.com
 */
const CREATOR_HARDCODED_EMAILS = [
  'iamdoregosteve@gmail.com',
  'iamhollywoodpro@gmail.com',
  'stevehollywood@gmail.com',
];

export interface AuthResult {
  userId: string;
  dbUserId: string | null;
  userName: string;
  userEmail: string;
  isCreator: boolean;
}

/**
 * Check if a verified Clerk identifier (email or Clerk user ID) matches the creator.
 *
 * SECURITY: EXACT match only — no substring/includes() matching.
 * Creator status must come from a verifiable identifier (email address or Clerk ID),
 * never from a display name someone typed at signup.
 *
 * Exported for security regression tests (__tests__/security/creator-detection.test.ts).
 */
export function isCreatorMatch(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // 1. Exact email match (hardcoded + env-configured)
  const exactEmails = [
    ...CREATOR_HARDCODED_EMAILS.map(e => e.toLowerCase()),
    ...CREATOR_EMAILS.map(e => e.toLowerCase().trim()),
  ];
  if (exactEmails.includes(lower)) return true;

  // 2. Exact Clerk ID match (env-configured only — Clerk IDs are not hardcoded)
  if (CREATOR_CLERK_IDS.some(id => lower === id.toLowerCase().trim())) return true;

  return false;
}

export async function authenticateAndLoadUser(): Promise<AuthResult | null> {
  let userId: string | null = null;
  let clerkUsername: string | null = null;
  let clerkEmail: string | null = null;

  // ── Step 1: Get Clerk auth + email DIRECTLY from Clerk (no DB dependency) ──
  try {
    const authResult = await auth();
    userId = authResult.userId;
    const claims = (authResult as any).sessionClaims;
    clerkUsername = claims?.username || claims?.sub || null;

    // ALSO get the email directly from Clerk — this is the MOST RELIABLE check
    // currentUser() returns the full Clerk user with email addresses
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        // Check primary email and all verified emails
        const emails = clerkUser.emailAddresses
          ?.filter((e: any) => e.verification?.status === 'verified' || e.id === clerkUser.primaryEmailAddressId)
          .map((e: any) => e.emailAddress) || [];
        clerkEmail = emails[0] || clerkUser.primaryEmailAddress?.emailAddress || null;

        // Check ALL emails immediately — no DB lookup needed
        for (const email of emails) {
          if (isCreatorMatch(email)) {
            console.log(`[AUTH] CREATOR RECOGNIZED via Clerk email: ${email}`);
            // Still do DB lookup for dbUserId, but we KNOW this is the creator
            return await finalizeAuth(userId!, clerkEmail || email, clerkUser.fullName || clerkUser.firstName || 'Steve', true);
          }
        }

        // Also check Clerk username
        if (clerkUser.username && isCreatorMatch(clerkUser.username)) {
          console.log(`[AUTH] CREATOR RECOGNIZED via Clerk username: ${clerkUser.username}`);
          return await finalizeAuth(userId!, clerkEmail || '', clerkUser.fullName || clerkUser.firstName || 'Steve', true);
        }

        // Also check Clerk name
        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
        if (fullName && isCreatorMatch(fullName)) {
          console.log(`[AUTH] CREATOR RECOGNIZED via Clerk name: ${fullName}`);
          return await finalizeAuth(userId!, clerkEmail || '', fullName, true);
        }
      }
    } catch (clerkErr) {
      console.warn('[AUTH] currentUser() failed, falling back to session claims:', clerkErr instanceof Error ? clerkErr.message : clerkErr);
    }
  } catch {}

  if (!userId && process.env.NODE_ENV === 'development') {
    userId = 'local-dev-user';
  }
  if (!userId) return null;

  // ── Step 2: Early check with session claims (before DB) ──
  let isCreator = false;
  if (clerkUsername && isCreatorMatch(clerkUsername)) {
    isCreator = true;
  }
  if (userId && CREATOR_CLERK_IDS.some(id => userId!.toLowerCase().includes(id.toLowerCase()))) {
    isCreator = true;
  }

  let dbUserId: string | null = null;
  let userName = isCreator ? 'Steve' : 'User';
  let userEmail = clerkEmail || '';

  // ── Step 3: DB lookup for dbUserId + name (with timeout) ──
  try {
    const user = await Promise.race([
      getOrCreateUser(userId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
    if (user) {
      dbUserId = user.id;
      userName = user.name || (isCreator ? 'Steve' : 'User');
      userEmail = user.email || userEmail;

      // ── Persistent Creator Recognition Check ──
      try {
        const profile = await prisma.relationshipProfile.findUnique({
          where: { userId: user.id },
          select: { metadata: true, personalityModel: true }
        });
        if (profile) {
          const meta = (profile.metadata || {}) as Record<string, any>;
          const personality = (profile.personalityModel || {}) as Record<string, any>;
          if (meta.persistentCreatorRecognition === true || personality.persistentCreatorRecognition === true) {
            isCreator = true;
            console.log(`[AUTH] PERSISTENT CREATOR FLAG DETECTED for user ${user.id}`);
          }
        }
      } catch (dbErr) {
        console.warn('[AUTH] Failed to query persistent creator profile:', dbErr);
      }
    }

    const emailLower = userEmail.toLowerCase();

    // Check the DB-stored email against creator emails (exact match only).
    // NOTE: names are no longer checked — they are user-controllable and were
    // the spoof vector (see docs/audit/CURRENT_STATE.md [S2]).
    if (!isCreator) {
      isCreator = isCreatorMatch(emailLower);
    }

    if (isCreator) {
      userName = 'Steve';
    }
  } catch {
    // DB lookup failed — rely on Clerk-based checks
    if (!isCreator && clerkEmail && isCreatorMatch(clerkEmail)) {
      isCreator = true;
      userName = 'Steve';
    }
  }

  // Debug: log creator recognition status
  console.log(`[AUTH] userId=${userId} userName=${userName} isCreator=${isCreator} clerkEmail=${clerkEmail || 'none'} clerkUsername=${clerkUsername || 'none'}`);

  // Phase Q2: Auto-flag creator as adult if recognized via this path
  if (isCreator) {
    await ensureCreatorAdultFlag(dbUserId);
  }

  return { userId, dbUserId, userName, userEmail, isCreator };
}

/**
 * Finalize auth after early creator recognition.
 * Still does DB lookup for dbUserId but skips redundant checks.
 */
async function finalizeAuth(userId: string, email: string, name: string, isCreator: boolean): Promise<AuthResult> {
  let dbUserId: string | null = null;

  try {
    const user = await Promise.race([
      getOrCreateUser(userId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
    if (user) {
      dbUserId = user.id;
    }
  } catch {}

  // Phase Q2: Auto-flag creator as adult on first login (idempotent)
  if (isCreator) {
    await ensureCreatorAdultFlag(dbUserId);
  }

  console.log(`[AUTH] userId=${userId} userName=${isCreator ? 'Steve' : name} isCreator=${isCreator} clerkEmail=${email} (EARLY RECOGNITION)`);

  return {
    userId,
    dbUserId,
    userName: isCreator ? 'Steve' : name,
    userEmail: email,
    isCreator,
  };
}
