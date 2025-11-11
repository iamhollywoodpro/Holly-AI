/**
 * Authentication Helper Functions - Modern @supabase/ssr
 * Server-side auth utilities for Next.js 14 App Router
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

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
 * Create Supabase client for Server Components and API Routes
 * Uses modern @supabase/ssr package with proper cookie handling
 */
export async function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get authenticated user from Supabase session
 * Works in both Server Components and API Routes
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('[Auth] Error getting user:', error?.message || 'No user')
      return null
    }

    console.log('[Auth] ✅ User authenticated:', user.id, user.email)

    // Get user profile with additional data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email,
      name: profile?.name || user.email || 'User',
      role: profile?.role || 'tester',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      created_at: profile?.created_at,
      last_active: profile?.last_active,
    }
  } catch (error) {
    console.error('[Auth] Exception getting user:', error)
    return null
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<UserProfile> {
  const user = await getAuthUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: 'owner' | 'team' | 'tester'): Promise<boolean> {
  const user = await getAuthUser()
  return user?.role === role
}

/**
 * Check if user is owner
 */
export async function isOwner(): Promise<boolean> {
  return hasRole('owner')
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('[Auth] Error getting session:', error)
    return null
  }
  
  return session
}
