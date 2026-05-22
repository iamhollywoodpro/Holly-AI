import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/user-manager';

const CREATOR_EMAILS = (process.env.CREATOR_EMAILS || '').split(',').filter(Boolean);
const CREATOR_CLERK_IDS = (process.env.CREATOR_CLERK_IDS || '').split(',').filter(Boolean);
const CREATOR_NAME_FRAGMENTS = (process.env.CREATOR_NAME_FRAGMENTS || '').split(',').filter(Boolean);

/**
 * Hardcoded fallback creator identifiers.
 * These ensure Holly ALWAYS recognizes her creator, even if env vars aren't configured.
 * This is intentional — the creator's identity is part of Holly's core identity.
 */
const CREATOR_HARDCODED_EMAILS = [
  'hollywood',
  'nexamusicgroup',
  'stevendorego',
  'stevefreshblendz',
  'iamdoregosteve',     // Creator's new primary email (iamdoregosteve@gmail.com)
  'iamhollywoodpro',    // Legacy email (being decommissioned)
];
const CREATOR_HARDCODED_NAME_FRAGMENTS = [
  'steve hollywood',
  'steve dorego',
  'steven dorego',
  'stevendorego',
  'stevefreshblendz',
  'nexamusic',
  'hollywood dorego',
  'dorego steve',
  'iamdoregosteve',
];

export interface AuthResult {
  userId: string;
  dbUserId: string | null;
  userName: string;
  userEmail: string;
  isCreator: boolean;
}

export async function authenticateAndLoadUser(): Promise<AuthResult | null> {
  let userId: string | null = null;
  let clerkUsername: string | null = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;
    const claims = (authResult as any).sessionClaims;
    clerkUsername = claims?.username || claims?.sub || null;
  } catch {}

  if (!userId && process.env.NODE_ENV === 'development') {
    userId = 'local-dev-user';
  }
  if (!userId) return null;

  let dbUserId: string | null = null;
  let userName = 'User';
  let userEmail = '';
  let isCreator = false;

  const earlyCreatorCheck = CREATOR_CLERK_IDS.some(id =>
    userId!.toLowerCase().includes(id.toLowerCase())
  ) || (clerkUsername ? CREATOR_CLERK_IDS.some(id =>
    clerkUsername.toLowerCase().includes(id.toLowerCase())
  ) : false)
  // Also check hardcoded fragments against clerkUsername
  || (clerkUsername ? CREATOR_HARDCODED_NAME_FRAGMENTS.some(f =>
    clerkUsername.toLowerCase().includes(f)
  ) || CREATOR_HARDCODED_EMAILS.some(e =>
    clerkUsername.toLowerCase().includes(e)
  ) : false);

  if (earlyCreatorCheck) {
    isCreator = true;
    userName = 'Steve';
  }

  try {
    const user = await Promise.race([
      getOrCreateUser(userId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
    if (user) {
      dbUserId = user.id;
      userName = user.name || (isCreator ? 'Steve' : 'User');
      userEmail = user.email || '';
    }

    const nameCheck = (user?.name || '').toLowerCase();
    const emailLower = userEmail.toLowerCase();

    // Check env vars first
    isCreator = isCreator
      || CREATOR_EMAILS.some(e => emailLower.includes(e.toLowerCase()))
      || CREATOR_NAME_FRAGMENTS.some(f => nameCheck.includes(f));

    // Hardcoded fallback — ensures creator is ALWAYS recognized
    if (!isCreator) {
      isCreator = CREATOR_HARDCODED_EMAILS.some(e => emailLower.includes(e))
        || CREATOR_HARDCODED_NAME_FRAGMENTS.some(f => nameCheck.includes(f));
    }

    if (isCreator) {
      userName = user?.name || 'Steve';
    }
  } catch {
    if (!isCreator) {
      isCreator = CREATOR_CLERK_IDS.some(id =>
        userId.toLowerCase().includes(id.toLowerCase())
      );
      // Hardcoded fallback in catch block too
      if (!isCreator && clerkUsername) {
        const usernameLower = clerkUsername.toLowerCase();
        isCreator = CREATOR_HARDCODED_NAME_FRAGMENTS.some(f => usernameLower.includes(f))
          || CREATOR_HARDCODED_EMAILS.some(e => usernameLower.includes(e));
      }
      if (isCreator) userName = 'Steve';
    }
  }

  // Debug: log creator recognition status
  console.log(`[AUTH] userId=${userId} userName=${userName} isCreator=${isCreator} clerkUsername=${clerkUsername || 'none'}`);

  return { userId, dbUserId, userName, userEmail, isCreator };
}
