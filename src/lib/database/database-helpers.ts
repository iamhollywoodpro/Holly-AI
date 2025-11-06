// ============================================================================
// HOLLY Database Helpers
// ============================================================================
// TypeScript helper functions for database CRUD operations
// Uses Supabase client for type-safe database access

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  email_verified: boolean;
  image?: string;
  preferences: UserPreferences;
  total_conversations: number;
  total_code_generations: number;
  total_deployments: number;
  violation_count: number;
  last_violation_at?: string;
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  codeStyle: {
    indent: 'spaces' | 'tabs';
    indentSize: number;
    quotes: 'single' | 'double';
    semicolons: boolean;
  };
  aiProvider: 'claude' | 'groq';
  notifications: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  messages: Message[];
  primary_emotion?: string;
  emotion_intensity?: number;
  emotion_confidence?: number;
  context?: Record<string, any>;
  is_active: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emotion?: {
    primary: string;
    intensity: number;
    confidence: number;
  };
}

export interface CodeHistory {
  id: string;
  user_id: string;
  conversation_id?: string;
  prompt: string;
  language: string;
  template?: string;
  code: string;
  filename?: string;
  tests?: string;
  documentation?: string;
  dependencies?: string[];
  warnings?: string[];
  suggestions?: string[];
  estimated_complexity?: 'low' | 'medium' | 'high';
  security_score?: number;
  security_passed?: boolean;
  security_issues?: any[];
  ethics_score?: number;
  ethics_approved?: boolean;
  ethics_violations?: any[];
  optimization_level?: 'basic' | 'standard' | 'aggressive';
  include_tests: boolean;
  include_docs: boolean;
  ai_provider: string;
  model?: string;
  tokens_used?: number;
  generation_time_ms?: number;
  is_deployed: boolean;
  deployed_at?: string;
  deployment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: string;
  user_id: string;
  code_history_id?: string;
  deployment_type: 'github' | 'whc' | 'vercel' | 'netlify' | 'other';
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolled_back';
  target_url?: string;
  repository_name?: string;
  branch_name: string;
  files?: DeploymentFile[];
  commit_sha?: string;
  deployment_url?: string;
  backup_id?: string;
  backup_created_at?: string;
  health_check_passed?: boolean;
  health_check_status_code?: number;
  health_check_response_time?: number;
  error_message?: string;
  error_details?: Record<string, any>;
  rolled_back_from?: string;
  rollback_reason?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface DeploymentFile {
  path: string;
  content: string;
  size: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  event_type: 'code_generation' | 'code_review' | 'code_optimization' | 'deployment' | 'github_operation' | 'ethics_violation' | 'security_block' | 'authentication' | 'user_action';
  action: string;
  request_prompt?: string;
  request_data?: Record<string, any>;
  approved?: boolean;
  blocked: boolean;
  block_reason?: string;
  violations?: any[];
  warnings?: any[];
  ethics_score?: number;
  security_score?: number;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

// ============================================================================
// DATABASE CLIENT
// ============================================================================

export class DatabaseClient {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  async createUser(data: {
    email: string;
    username?: string;
    full_name?: string;
    preferences?: Partial<UserPreferences>;
  }): Promise<User | null> {
    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        preferences: data.preferences || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return user as User;
  }

  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }

    return data as User;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data as User;
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const updatedPreferences = {
      ...user.preferences,
      ...preferences,
    };

    return this.updateUser(userId, { preferences: updatedPreferences });
  }

  async incrementViolationCount(userId: string): Promise<void> {
  // First get current count
  const { data: user } = await this.supabase
    .from('users')
    .select('violation_count')
    .eq('id', userId)
    .single();
  
  // Then increment it
  const { error } = await this.supabase
    .from('users')
    .update({ 
      violation_count: (user?.violation_count || 0) + 1 
    })
    .eq('id', userId);
}

  // ==========================================================================
  // CONVERSATIONS
  // ==========================================================================

  async createConversation(data: {
    user_id: string;
    title?: string;
    context?: Record<string, any>;
  }): Promise<Conversation | null> {
    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .insert({
        user_id: data.user_id,
        title: data.title,
        context: data.context,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return conversation as Conversation;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return data as Conversation;
  }

  async getUserConversations(userId: string, activeOnly = true): Promise<Conversation[]> {
    let query = this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data as Conversation[];
  }

  async addMessage(conversationId: string, message: Message, emotion?: {
    primary: string;
    intensity: number;
    confidence: number;
  }): Promise<Conversation | null> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return null;

    const updatedMessages = [...conversation.messages, message];

    const updates: any = {
      messages: updatedMessages,
      message_count: updatedMessages.length,
      last_message_at: new Date().toISOString(),
    };

    if (emotion) {
      updates.primary_emotion = emotion.primary;
      updates.emotion_intensity = emotion.intensity;
      updates.emotion_confidence = emotion.confidence;
    }

    const { data, error } = await this.supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return null;
    }

    return data as Conversation;
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      return null;
    }

    return data as Conversation;
  }

  async deactivateConversation(conversationId: string): Promise<void> {
    await this.supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', conversationId);
  }

  // ==========================================================================
  // CODE HISTORY
  // ==========================================================================

  async saveCodeGeneration(data: {
    user_id: string;
    conversation_id?: string;
    prompt: string;
    language: string;
    template?: string;
    code: string;
    filename?: string;
    tests?: string;
    documentation?: string;
    dependencies?: string[];
    warnings?: string[];
    suggestions?: string[];
    estimated_complexity?: 'low' | 'medium' | 'high';
    security_score?: number;
    security_passed?: boolean;
    security_issues?: any[];
    ethics_score?: number;
    ethics_approved?: boolean;
    ethics_violations?: any[];
    optimization_level?: 'basic' | 'standard' | 'aggressive';
    include_tests?: boolean;
    include_docs?: boolean;
    ai_provider?: string;
    model?: string;
    tokens_used?: number;
    generation_time_ms?: number;
  }): Promise<CodeHistory | null> {
    const { data: codeHistory, error } = await this.supabase
      .from('code_history')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error saving code generation:', error);
      return null;
    }

    return codeHistory as CodeHistory;
  }

  async getCodeHistory(codeHistoryId: string): Promise<CodeHistory | null> {
    const { data, error } = await this.supabase
      .from('code_history')
      .select('*')
      .eq('id', codeHistoryId)
      .single();

    if (error) {
      console.error('Error fetching code history:', error);
      return null;
    }

    return data as CodeHistory;
  }

  async getUserCodeHistory(userId: string, limit = 50): Promise<CodeHistory[]> {
    const { data, error } = await this.supabase
      .from('code_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user code history:', error);
      return [];
    }

    return data as CodeHistory[];
  }

  async searchCode(userId: string, searchTerm: string): Promise<CodeHistory[]> {
    const { data, error } = await this.supabase
      .from('code_history')
      .select('*')
      .eq('user_id', userId)
      .or(`prompt.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching code:', error);
      return [];
    }

    return data as CodeHistory[];
  }

  async updateCodeHistory(codeHistoryId: string, updates: Partial<CodeHistory>): Promise<CodeHistory | null> {
    const { data, error } = await this.supabase
      .from('code_history')
      .update(updates)
      .eq('id', codeHistoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating code history:', error);
      return null;
    }

    return data as CodeHistory;
  }

  async markAsDeployed(codeHistoryId: string, deploymentUrl: string): Promise<void> {
    await this.supabase
      .from('code_history')
      .update({
        is_deployed: true,
        deployed_at: new Date().toISOString(),
        deployment_url: deploymentUrl,
      })
      .eq('id', codeHistoryId);
  }

  // ==========================================================================
  // DEPLOYMENTS
  // ==========================================================================

  async createDeployment(data: {
    user_id: string;
    code_history_id?: string;
    deployment_type: 'github' | 'whc' | 'vercel' | 'netlify' | 'other';
    target_url?: string;
    repository_name?: string;
    branch_name?: string;
    files?: DeploymentFile[];
  }): Promise<Deployment | null> {
    const { data: deployment, error } = await this.supabase
      .from('deployments')
      .insert({
        ...data,
        status: 'pending',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deployment:', error);
      return null;
    }

    return deployment as Deployment;
  }

  async getDeployment(deploymentId: string): Promise<Deployment | null> {
    const { data, error } = await this.supabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (error) {
      console.error('Error fetching deployment:', error);
      return null;
    }

    return data as Deployment;
  }

  async getUserDeployments(userId: string, limit = 50): Promise<Deployment[]> {
    const { data, error } = await this.supabase
      .from('deployments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user deployments:', error);
      return [];
    }

    return data as Deployment[];
  }

  async updateDeploymentStatus(
    deploymentId: string,
    status: 'deploying' | 'success' | 'failed' | 'rolled_back',
    data?: {
      commit_sha?: string;
      deployment_url?: string;
      error_message?: string;
      error_details?: Record<string, any>;
    }
  ): Promise<Deployment | null> {
    const updates: any = {
      status,
      completed_at: new Date().toISOString(),
      ...data,
    };

    const { data: deployment, error } = await this.supabase
      .from('deployments')
      .update(updates)
      .eq('id', deploymentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating deployment status:', error);
      return null;
    }

    return deployment as Deployment;
  }

  async updateHealthCheck(
    deploymentId: string,
    passed: boolean,
    statusCode: number,
    responseTime: number
  ): Promise<void> {
    await this.supabase
      .from('deployments')
      .update({
        health_check_passed: passed,
        health_check_status_code: statusCode,
        health_check_response_time: responseTime,
      })
      .eq('id', deploymentId);
  }

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  async createAuditLog(data: {
    user_id?: string;
    event_type: AuditLog['event_type'];
    action: string;
    request_prompt?: string;
    request_data?: Record<string, any>;
    approved?: boolean;
    blocked?: boolean;
    block_reason?: string;
    violations?: any[];
    warnings?: any[];
    ethics_score?: number;
    security_score?: number;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
  }): Promise<AuditLog | null> {
    const { data: auditLog, error } = await this.supabase
      .from('audit_logs')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      return null;
    }

    return auditLog as AuditLog;
  }

  async getUserAuditLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data as AuditLog[];
  }

  async getBlockedRequests(userId?: string): Promise<AuditLog[]> {
    let query = this.supabase
      .from('audit_logs')
      .select('*')
      .eq('blocked', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching blocked requests:', error);
      return [];
    }

    return data as AuditLog[];
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getUserStats(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_stats')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  }

  async getRecentActivity(userId: string, limit = 20): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('recent_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }

    return data;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let dbClient: DatabaseClient | null = null;

export function getDatabaseClient(): DatabaseClient {
  if (!dbClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    dbClient = new DatabaseClient(supabaseUrl, supabaseKey);
  }

  return dbClient;
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
import { getDatabaseClient } from './database-helpers';

const db = getDatabaseClient();

// Create a user
const user = await db.createUser({
  email: 'hollywood@example.com',
  username: 'hollywood',
  full_name: 'Steve Hollywood Dorego',
});

// Create a conversation
const conversation = await db.createConversation({
  user_id: user.id,
  title: 'Building HOLLY',
});

// Add messages
await db.addMessage(conversation.id, {
  role: 'user',
  content: 'Generate a React component',
  timestamp: new Date().toISOString(),
});

// Save code generation
const codeHistory = await db.saveCodeGeneration({
  user_id: user.id,
  conversation_id: conversation.id,
  prompt: 'Create a login form',
  language: 'typescript',
  code: 'export const LoginForm = () => { ... }',
  security_score: 95,
  security_passed: true,
  ethics_score: 100,
  ethics_approved: true,
  ai_provider: 'claude',
});

// Create audit log
await db.createAuditLog({
  user_id: user.id,
  event_type: 'code_generation',
  action: 'generate_react_component',
  request_prompt: 'Create a login form',
  approved: true,
  security_score: 95,
  ethics_score: 100,
});
*/
