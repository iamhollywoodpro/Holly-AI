/**
 * Client-side Supabase client for browser/React components
 * Uses @supabase/ssr for proper cookie handling
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Get or create Supabase client for browser use
 * Singleton pattern to reuse same client instance
 */
export function getSupabaseBrowserClient() {
  if (client) {
    return client
  }

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}

/**
 * Alias for compatibility
 */
export const createClient = getSupabaseBrowserClient
