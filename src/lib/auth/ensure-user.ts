import { prisma } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Ensures a user exists in the database, creating them if needed
 * This is a fallback for when webhooks haven't fired yet
 */
export async function ensureUserExists() {
  try {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return null;
    }

    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    // If not, create them
    if (!user) {
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const name = clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}` 
        : clerkUser.firstName || null;

      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email,
          name,
          avatarUrl: clerkUser.imageUrl || null,
        },
      });

      console.log('[ensureUserExists] ✅ Created user:', user.id);
    }

    return user;
  } catch (error) {
    console.error('[ensureUserExists] Error:', error);
    return null;
  }
}
