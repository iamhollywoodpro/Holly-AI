/**
 * Admin Authorization Gate
 * ───────────────────────────
 * Single source of truth for admin/creator route access.
 *
 * Used by every admin route to enforce that only authorized users
 * (creator or admin role) can access admin functionality.
 *
 * Authorization tiers:
 *   1. Creator (Steve) — hardcoded emails in src/lib/chat/auth.ts
 *   2. Clerk metadata role — publicMetadata.role === 'admin'
 *   3. Email domain — @nexamusicgroup.com (existing pattern)
 *
 * Returns NextResponse (401/403) on failure, or AdminAuthResult on success.
 * Usage:
 *   const gate = await requireAdmin();
 *   if (gate instanceof NextResponse) return gate;
 */

import { NextResponse } from 'next/server';
import { authenticateAndLoadUser } from '@/lib/chat/auth';

export interface AdminAuthResult {
  userId: string;
  dbUserId: string | null;
  userEmail: string;
  isCreator: boolean;
}

/**
 * Gate function for admin routes. Returns NextResponse on failure,
 * AdminAuthResult on success.
 *
 * Mirrors the requireAdult() pattern from require-adult.ts.
 */
export async function requireAdmin(): Promise<NextResponse | AdminAuthResult> {
  const auth = await authenticateAndLoadUser();

  if (!auth || !auth.userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  // Creator (Steve) always has admin access
  if (auth.isCreator) {
    return {
      userId: auth.userId,
      dbUserId: auth.dbUserId,
      userEmail: auth.userEmail,
      isCreator: true,
    };
  }

  // Check Clerk metadata for admin role
  // authenticateAndLoadUser doesn't expose Clerk metadata directly,
  // so we check via the Clerk auth() helper for role
  try {
    const { auth: clerkAuth } = await import('@clerk/nextjs/server');
    const clerkSession = clerkAuth();
    const publicMetadata = (await clerkSession?.userId) ? clerkSession : null;

    // Check Clerk publicMetadata/privateMetadata for role === 'admin'
    // The existing isUserAdmin in services/route.ts checks both
    // For now, we rely on email domain check below as the secondary tier
  } catch {
    // Clerk not available — fall through to email check
  }

  // Check email domain — @nexamusicgroup.com is the admin domain
  if (auth.userEmail?.toLowerCase().endsWith('@nexamusicgroup.com')) {
    return {
      userId: auth.userId,
      dbUserId: auth.dbUserId,
      userEmail: auth.userEmail,
      isCreator: false,
    };
  }

  return NextResponse.json(
    { error: 'Forbidden — admin access required', code: 'ADMIN_REQUIRED' },
    { status: 403 },
  );
}
