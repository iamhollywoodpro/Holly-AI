/**
 * HOLLY Supabase Configuration
 * 
 * Supabase client initialization for database operations.
 * 
 * Project Details:
 * - Project Name: HOLLY SUPER AGENT
 * - Project ID: npypueptfceqyzklgclm
 * - Database: PostgreSQL 15
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ============================================================================
// Environment Variables
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

// ============================================================================
// Supabase Clients
// ============================================================================

/**
 * Public Supabase client (uses anon key)
 * Safe for frontend use - respects Row Level Security (RLS)
 */
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'HOLLY'
    }
  }
});

/**
 * Admin Supabase client (uses service role key)
 * Backend only - bypasses Row Level Security
 * Use with caution!
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<any>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'HOLLY-ADMIN'
        }
      }
    })
  : null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Test database connection
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: 'Database connection failed',
        details: error
      };
    }

    return {
      success: true,
      message: 'Database connection successful',
      details: { connected: true }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database connection error',
      details: error
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  conversations: number;
  users: number;
  codeHistory: number;
  totalRecords: number;
}> {
  try {
    const [conversationsCount, usersCount, codeHistoryCount] = await Promise.all([
      supabase.from('conversations').select('count').single(),
      supabase.from('users').select('count').single(),
      supabase.from('code_history').select('count').single()
    ]);

    return {
      conversations: conversationsCount.data?.count || 0,
      users: usersCount.data?.count || 0,
      codeHistory: codeHistoryCount.data?.count || 0,
      totalRecords: 
        (conversationsCount.data?.count || 0) +
        (usersCount.data?.count || 0) +
        (codeHistoryCount.data?.count || 0)
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      conversations: 0,
      users: 0,
      codeHistory: 0,
      totalRecords: 0
    };
  }
}

/**
 * Execute raw SQL query (admin only)
 */
export async function executeSQL(query: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Admin client not configured'
    };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to conversation updates
 */
export function subscribeToConversations(
  userId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to code generation updates
 */
export function subscribeToCodeHistory(
  userId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`code_history:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'code_history',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
}

// ============================================================================
// Connection Info
// ============================================================================

export const connectionInfo = {
  url: supabaseUrl,
  projectId: 'npypueptfceqyzklgclm',
  region: 'us-east-1',
  hasAdminClient: !!supabaseAdmin
};

// ============================================================================
// Export types
// ============================================================================

export type { Database } from '@/types/database';
