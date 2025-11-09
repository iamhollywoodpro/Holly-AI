/**
 * Simplified User-Scoped Consciousness
 * Direct database operations with user_id filtering
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get user's active goals from database
 */
export async function getUserGoals(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('holly_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching user goals:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's recent experiences
 */
export async function getUserExperiences(
  supabase: SupabaseClient, 
  userId: string,
  limit: number = 10
) {
  const { data, error } = await supabase
    .from('holly_experiences')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user experiences:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's identity
 */
export async function getUserIdentity(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('holly_identity')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user identity:', error);
    return null;
  }

  return data;
}

/**
 * Record experience for user
 */
export async function recordUserExperience(
  supabase: SupabaseClient,
  userId: string,
  experience: any
) {
  const { data, error } = await supabase
    .from('holly_experiences')
    .insert({
      ...experience,
      user_id: userId,
      timestamp: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording user experience:', error);
    throw error;
  }

  return data;
}
