/**
 * Authentication Helper Functions
 * Server-side and client-side auth utilities
 */

import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export type UserProfile = {
  id: string;
  name: string;
  role: 'owner' | 'team' | 'tester';
  email?: string;
  avatar_url?: string;
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
 * Create Supabase client for API Route handlers
 * USE THIS IN API ROUTES (not createServerSupabaseClient)
 */
export function createRouteHandlerSupabaseClient() {
  return createRouteHandlerClient<Database>({ cookies });
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
 * Get authenticated user from API Route handler
 * USE THIS IN API ROUTES (not getAuthUser)
 */
export async function getAuthUserFromRoute(): Promise<UserProfile | null> {
  try {
    const supabase = createRouteHandlerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('[Auth Route] Auth failed:', error?.message || 'No user');
      return null;
    }

    console.log('[Auth Route] ✅ User authenticated:', user.id, user.email);

    // Get user profile with additional data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name || null,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      created_at: profile?.created_at,
      last_active: profile?.last_active,
    };
  } catch (error) {
    console.error('[Auth Route] Exception:', error);
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
