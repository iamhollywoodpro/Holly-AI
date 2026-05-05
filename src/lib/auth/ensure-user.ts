import { prisma } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Ensures a user exists in the database, creating them if needed
 * This is a fallback for when webhooks haven't fired yet
 */
export async function ensureUserExists() {
  try {
    console.log('[ensureUserExists] Starting...');
    
    const clerkUser = await currentUser();
    console.log('[ensureUserExists] Clerk user:', clerkUser ? `ID: ${clerkUser.id}, Email: ${clerkUser.emailAddresses[0]?.emailAddress}` : 'NULL');
    
    if (!clerkUser) {
      console.error('[ensureUserExists] No Clerk user found');
      return null;
    }

    // Check if user exists in database
    console.log('[ensureUserExists] Checking database for clerkUserId:', clerkUser.id);
    let user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUser.id },
    });
    console.log('[ensureUserExists] Database lookup result:', user ? `Found user ${user.id}` : 'Not found');

    // If not, create them
    if (!user) {
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const name = clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}` 
        : clerkUser.firstName || null;

      console.log('[ensureUserExists] Creating new user with email:', email);
      user = await prisma.user.create({
        data: {
          clerkUserId: clerkUser.id,
          email,
          name,
          imageUrl: clerkUser.imageUrl || null,
        },
      });

      console.log('[ensureUserExists] ✅ Created user:', user.id);
    }

    console.log('[ensureUserExists] ✅ Returning user:', user.id);
    return user;
  } catch (error) {
    console.error('[ensureUserExists] ❌ CRITICAL ERROR:');
    console.error('[ensureUserExists] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[ensureUserExists] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[ensureUserExists] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
}
