// HOLLY Feature 46: Financial Intelligence - Budget Manager
// Simple budget tracking with smart alerts

// REMOVED: Supabase import (migrated to Prisma)
import type { TransactionCategory } from './transaction-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface Budget {
  id: string;
  user_id: string;
  category: TransactionCategory;
  monthly_limit: number;
  period_start: string; // ISO date
  period_end: string; // ISO date
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  is_over_budget: boolean;
  days_remaining: number;
  daily_average_spent: number;
  suggested_daily_limit: number;
}

export interface BudgetManagerConfig {
  supabase_url: string;
  supabase_key: string;
}

// ============================================================================
// BUDGET MANAGER
// ============================================================================

export class BudgetManager {
  private supabase: SupabaseClient;

  constructor(config: BudgetManagerConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);
  }

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  async createBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget> {
    try {
      const { data, error } = await this.supabase
        .from('budgets')
        .insert({
          ...budget,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create budget error:', error);
      throw error;
    }
  }

  async getBudget(budgetId: string, userId: string): Promise<Budget | null> {
    try {
      const { data, error } = await this.supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get budget error:', error);
      return null;
    }
  }

  async updateBudget(budgetId: string, userId: string, updates: Partial<Budget>): Promise<Budget> {
    try {
      const { data, error } = await this.supabase
        .from('budgets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update budget error:', error);
      throw error;
    }
  }

  async deleteBudget(budgetId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete budget error:', error);
      throw error;
    }
  }

  async listBudgets(userId: string, options?: {
    category?: TransactionCategory;
    active_only?: boolean;
  }): Promise<Budget[]> {
    try {
      let query = this.supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.active_only) {
        const now = new Date().toISOString().split('T')[0];
        query = query.lte('period_start', now).gte('period_end', now);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('List budgets error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // BUDGET STATUS & TRACKING
  // --------------------------------------------------------------------------

  async getBudgetStatus(budgetId: string, userId: string): Promise<BudgetStatus | null> {
    try {
      const budget = await this.getBudget(budgetId, userId);
      if (!budget) return null;

      // Get spending for this category in period
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category', budget.category)
        .eq('type', 'expense')
        .gte('date', budget.period_start)
        .lte('date', budget.period_end);

      if (error) throw error;

      const spent = transactions
        ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        : 0;

      const remaining = budget.monthly_limit - spent;
      const percentage = (spent / budget.monthly_limit) * 100;
      const is_over_budget = spent > budget.monthly_limit;

      // Calculate days remaining
      const now = new Date();
      const endDate = new Date(budget.period_end);
      const days_remaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      // Calculate averages
      const startDate = new Date(budget.period_start);
      const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daily_average_spent = spent / daysElapsed;
      const suggested_daily_limit = days_remaining > 0 ? remaining / days_remaining : 0;

      return {
        budget,
        spent,
        remaining,
        percentage,
        is_over_budget,
        days_remaining,
        daily_average_spent,
        suggested_daily_limit,
      };
    } catch (error) {
      console.error('Get budget status error:', error);
      return null;
    }
  }

  async getAllBudgetStatuses(userId: string): Promise<BudgetStatus[]> {
    try {
      const budgets = await this.listBudgets(userId, { active_only: true });
      const statuses = await Promise.all(
        budgets.map(b => this.getBudgetStatus(b.id, userId))
      );
      return statuses.filter(s => s !== null) as BudgetStatus[];
    } catch (error) {
      console.error('Get all budget statuses error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // QUICK SETUP
  // --------------------------------------------------------------------------

  async createMonthlyBudget(
    userId: string,
    category: TransactionCategory,
    monthlyLimit: number
  ): Promise<Budget> {
    const now = new Date();
    const period_start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const period_end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    return this.createBudget({
      user_id: userId,
      category,
      monthly_limit: monthlyLimit,
      period_start,
      period_end,
    });
  }

  async setupDefaultBudgets(userId: string, monthlyIncome: number): Promise<Budget[]> {
    // 50/30/20 rule: 50% needs, 30% wants, 20% savings
    const needs = monthlyIncome * 0.5;
    const wants = monthlyIncome * 0.3;

    const defaultBudgets = [
      { category: 'housing' as TransactionCategory, limit: needs * 0.4 },
      { category: 'food_groceries' as TransactionCategory, limit: needs * 0.15 },
      { category: 'utilities' as TransactionCategory, limit: needs * 0.1 },
      { category: 'transportation' as TransactionCategory, limit: needs * 0.15 },
      { category: 'healthcare' as TransactionCategory, limit: needs * 0.1 },
      { category: 'food_dining' as TransactionCategory, limit: wants * 0.3 },
      { category: 'entertainment' as TransactionCategory, limit: wants * 0.25 },
      { category: 'shopping' as TransactionCategory, limit: wants * 0.25 },
      { category: 'subscriptions' as TransactionCategory, limit: wants * 0.2 },
    ];

    const created = [];
    for (const { category, limit } of defaultBudgets) {
      try {
        const budget = await this.createMonthlyBudget(userId, category, Math.round(limit));
        created.push(budget);
      } catch (error) {
        console.error(`Failed to create budget for ${category}:`, error);
      }
    }

    return created;
  }

  // --------------------------------------------------------------------------
  // ALERTS & WARNINGS
  // --------------------------------------------------------------------------

  async getOverBudgetCategories(userId: string): Promise<BudgetStatus[]> {
    const statuses = await this.getAllBudgetStatuses(userId);
    return statuses.filter(s => s.is_over_budget);
  }

  async getNearLimitCategories(userId: string, threshold: number = 80): Promise<BudgetStatus[]> {
    const statuses = await this.getAllBudgetStatuses(userId);
    return statuses.filter(s => s.percentage >= threshold && !s.is_over_budget);
  }

  async getBudgetAlerts(userId: string): Promise<Array<{
    type: 'over_budget' | 'near_limit' | 'on_track';
    category: TransactionCategory;
    message: string;
    status: BudgetStatus;
  }>> {
    const alerts: Array<{
      type: 'over_budget' | 'near_limit' | 'on_track';
      category: TransactionCategory;
      message: string;
      status: BudgetStatus;
    }> = [];

    const statuses = await this.getAllBudgetStatuses(userId);

    statuses.forEach(status => {
      if (status.is_over_budget) {
        alerts.push({
          type: 'over_budget',
          category: status.budget.category,
          message: `Over budget by $${Math.abs(status.remaining).toFixed(2)} in ${status.budget.category}`,
          status,
        });
      } else if (status.percentage >= 90) {
        alerts.push({
          type: 'near_limit',
          category: status.budget.category,
          message: `${status.percentage.toFixed(0)}% of budget used in ${status.budget.category}`,
          status,
        });
      } else if (status.percentage <= 50 && status.days_remaining <= 10) {
        alerts.push({
          type: 'on_track',
          category: status.budget.category,
          message: `On track! Only ${status.percentage.toFixed(0)}% used in ${status.budget.category}`,
          status,
        });
      }
    });

    return alerts;
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  async checkCanAfford(userId: string, category: TransactionCategory, amount: number): Promise<{
    can_afford: boolean;
    remaining_budget: number;
    would_exceed_by: number;
  }> {
    try {
      const budgets = await this.listBudgets(userId, { category, active_only: true });
      
      if (budgets.length === 0) {
        return {
          can_afford: true,
          remaining_budget: Infinity,
          would_exceed_by: 0,
        };
      }

      const status = await this.getBudgetStatus(budgets[0].id, userId);
      if (!status) {
        return {
          can_afford: true,
          remaining_budget: 0,
          would_exceed_by: 0,
        };
      }

      const can_afford = status.remaining >= amount;
      const would_exceed_by = can_afford ? 0 : amount - status.remaining;

      return {
        can_afford,
        remaining_budget: status.remaining,
        would_exceed_by,
      };
    } catch (error) {
      console.error('Check can afford error:', error);
      return {
        can_afford: true,
        remaining_budget: 0,
        would_exceed_by: 0,
      };
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default BudgetManager;
