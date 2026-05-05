import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/user-manager';

const CREATOR_EMAILS = (process.env.CREATOR_EMAILS || '').split(',').filter(Boolean);
const CREATOR_CLERK_IDS = (process.env.CREATOR_CLERK_IDS || '').split(',').filter(Boolean);
const CREATOR_NAME_FRAGMENTS = (process.env.CREATOR_NAME_FRAGMENTS || '').split(',').filter(Boolean);

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
    isCreator = isCreator
      || CREATOR_EMAILS.some(e => userEmail.toLowerCase().includes(e.toLowerCase()))
      || (userEmail.toLowerCase().includes('hollywood') && CREATOR_EMAILS.length > 0)
      || (userEmail.toLowerCase().includes('nexamusicgroup') && CREATOR_EMAILS.length > 0)
      || CREATOR_NAME_FRAGMENTS.some(f => nameCheck.includes(f));

    if (isCreator) {
      userName = user?.name || 'Steve';
    }
  } catch {
    if (!isCreator) {
      isCreator = CREATOR_CLERK_IDS.some(id =>
        userId.toLowerCase().includes(id.toLowerCase())
      );
      if (isCreator) userName = 'Steve';
    }
  }

  return { userId, dbUserId, userName, userEmail, isCreator };
}
