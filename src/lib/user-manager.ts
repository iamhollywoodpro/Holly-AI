/**
 * HOLLY User Manager - Centralized user creation/management
 * Prevents duplicate users and ensures data integrity
 */

import { prisma } from '@/lib/db';
import { clerkClient, currentUser } from '@clerk/nextjs/server';

interface UserInfo {
  clerkUserId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Get or create user - SINGLE SOURCE OF TRUTH
 * Always call this instead of creating users directly
 */
export async function getOrCreateUser(clerkUserId: string): Promise<{ id: string; clerkUserId: string; email: string; name?: string | null; imageUrl?: string | null }> {
  try {
    console.log('👤 [UserManager] Getting/creating user for Clerk ID:', clerkUserId);

    // DEVELOPMENT ONLY: MOCK USER TO BYPASS INVALID PUBLISHABLE KEY ERRORS
    if (clerkUserId === 'local-dev-user' && process.env.NODE_ENV === 'development') {
      console.log('🚧 [UserManager] Using local mock user to bypass Clerk auth.');
      let user = await prisma.user.findUnique({
        where: { email: 'dev@holly.local' },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkUserId: 'local-dev-user',
            email: 'dev@holly.local',
            name: 'Local Developer',
          },
        });
      }
      return user;
    }

    // CRITICAL: Get REAL email from Clerk using clerkClient (works in API routes)
    // clerkClient() must be called as a function in Clerk v5
    console.log('🔍 [UserManager] Calling clerkClient().users.getUser()...');
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkUserId);
    console.log('✅ [UserManager] Got Clerk user:', clerkUser?.id || 'NULL');

    if (!clerkUser) {
      console.error('❌ [UserManager] No user found in Clerk');
      throw new Error('User not found in Clerk');
    }

    const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress;

    if (!primaryEmail) {
      throw new Error('No email address found in Clerk account');
    }

    // Validate email format
    if (!isValidEmail(primaryEmail)) {
      throw new Error(`Invalid email format: ${primaryEmail}`);
    }

    console.log('✅ [UserManager] Clerk email validated:', primaryEmail);

    // Try to find existing user by Clerk ID
    let user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
    });

    if (user) {
      console.log('✅ [UserManager] User found by Clerk ID:', user.id);

      // Update email if it's wrong or empty
      if (user.email !== primaryEmail) {
        console.log('🔄 [UserManager] Updating user email from', user.email, 'to', primaryEmail);
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: primaryEmail,
            name: clerkUser.fullName || user.name,
            imageUrl: clerkUser.imageUrl || user.imageUrl,
          },
        });
      }

      return user;
    }

    // User not found by Clerk ID - check if they exist by email
    console.log('🔍 [UserManager] No user with Clerk ID, checking email...');
    user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (user) {
      console.log('🔄 [UserManager] User found by email, linking Clerk ID:', user.id);
      // Link this Clerk ID to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          clerkUserId: clerkUserId,
          name: clerkUser.fullName || user.name,
          imageUrl: clerkUser.imageUrl || user.imageUrl,
        },
      });
      return user;
    }

    // Create new user with REAL email
    console.log('📝 [UserManager] Creating new user with email:', primaryEmail);
    user = await prisma.user.create({
      data: {
        clerkUserId: clerkUserId,
        email: primaryEmail,
        name: clerkUser.fullName,
        imageUrl: clerkUser.imageUrl,
      },
    });

    console.log('✅ [UserManager] New user created:', user.id);
    return user;
  } catch (error) {
    console.error('❌ [UserManager] CRITICAL ERROR in getOrCreateUser:');
    console.error('❌ [UserManager] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ [UserManager] Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ [UserManager] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ [UserManager] Clerk User ID:', clerkUserId);
    throw error;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Find user by Clerk ID
 */
export async function findUserByClerkId(clerkUserId: string) {
  return await prisma.user.findUnique({
    where: { clerkUserId: clerkUserId },
  });
}

/**
 * Merge duplicate user accounts
 * Moves all data from sourceUserId to targetUserId
 */
export async function mergeUserAccounts(sourceUserId: string, targetUserId: string) {
  console.log('🔀 [UserManager] Merging users:', sourceUserId, '→', targetUserId);

  // Move conversations
  await prisma.conversation.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  });

  // Move file uploads
  await prisma.fileUpload.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  });

  // Move other user data as needed...

  // Delete source user
  await prisma.user.delete({
    where: { id: sourceUserId },
  });

  console.log('✅ [UserManager] Users merged successfully');
}
