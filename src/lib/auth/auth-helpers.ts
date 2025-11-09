/**
 * Authentication Helper Functions
 * Server-side and client-side auth utilities
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export type UserProfile = {
  id: string;
  name: string;
  role: 'owner' | 'team' | 'tester';
  email?: string;
  created_at?: string;
  last_active?: string;
};

/**
 * Create Supabase client for server components
 */
export function createServerSupabaseClient() {
  return createServerComponentClient<Database>({ cookies });
}

/**
 * Get authenticated user from server context
 */
export async function getAuthUser(): Promise<UserProfile | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get user profile with additional data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      name: profile?.name || user.email || 'User',
      role: profile?.role || 'tester',
      created_at: profile?.created_at,
      last_active: profile?.last_active,
    };
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<UserProfile> {
  const user = await getAuthUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: UserProfile, roles: UserProfile['role'][]): boolean {
  return roles.includes(user.role);
}

/**
 * Update user's last active timestamp
 */
export async function updateLastActive(userId: string): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    await supabase
      .from('user_profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating last active:', error);
  }
}
