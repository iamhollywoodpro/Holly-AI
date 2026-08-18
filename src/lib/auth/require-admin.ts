/**
 * Admin Authorization Gate
 * ───────────────────────────
 * Single source of truth for admin/creator route access.
 *
 * Used by every admin route to enforce that only authorized users
 * (creator or admin role) can access admin functionality.
 *
 * Authorization tiers:
 *   1. Creator (Steve) — exact-match emails in src/lib/chat/auth.ts
 *   2. Email domain — @nexamusicgroup.com (verified via Clerk email auth)
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

  // Check email domain — @nexamusicgroup.com is the admin domain.
  // Email domain control (via Clerk verification) is proof of ownership,
  // so this tier cannot be spoofed by self-registered users.
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
