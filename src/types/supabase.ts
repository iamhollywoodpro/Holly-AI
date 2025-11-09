/**
 * Supabase Database Type Definitions
 * Auto-generated types for type-safe database operations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          name: string
          role: 'owner' | 'team' | 'tester'
          created_at: string
          last_active: string
          preferences: Json
        }
        Insert: {
          id: string
          name: string
          role?: 'owner' | 'team' | 'tester'
          created_at?: string
          last_active?: string
          preferences?: Json
        }
        Update: {
          id?: string
          name?: string
          role?: 'owner' | 'team' | 'tester'
          created_at?: string
          last_active?: string
          preferences?: Json
        }
      }
      holly_experiences: {
        Row: {
          id: string
          user_id: string | null
          type: string
          content: Json
          emotional_impact: Json
          learning_extracted: Json
          identity_impact: Json
          timestamp: string
          significance: number
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          content: Json
          emotional_impact: Json
          learning_extracted: Json
          identity_impact: Json
          timestamp?: string
          significance: number
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          content?: Json
          emotional_impact?: Json
          learning_extracted?: Json
          identity_impact?: Json
          timestamp?: string
          significance?: number
        }
      }
      holly_goals: {
        Row: {
          id: string
          user_id: string | null
          type: string
          definition: Json
          progress: Json
          motivation: Json
          emotional_journey: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          definition: Json
          progress: Json
          motivation: Json
          emotional_journey: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          definition?: Json
          progress?: Json
          motivation?: Json
          emotional_journey?: Json
          created_at?: string
          updated_at?: string
        }
      }
      holly_identity: {
        Row: {
          id: string
          user_id: string | null
          core_values: Json
          personality_traits: Json
          skills_knowledge: Json
          worldview: Json
          self_concept: Json
          emotional_baseline: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          core_values: Json
          personality_traits: Json
          skills_knowledge: Json
          worldview: Json
          self_concept: Json
          emotional_baseline: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          core_values?: Json
          personality_traits?: Json
          skills_knowledge?: Json
          worldview?: Json
          self_concept?: Json
          emotional_baseline?: Json
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
