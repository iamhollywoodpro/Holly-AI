// HOLLY Feature 46: Financial Intelligence - Transaction Manager
// Lean transaction tracking with smart categorization

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 
  | 'income_salary' | 'income_freelance' | 'income_investment' | 'income_other'
  | 'housing' | 'transportation' | 'food_dining' | 'food_groceries'
  | 'utilities' | 'healthcare' | 'entertainment' | 'shopping'
  | 'education' | 'subscriptions' | 'savings' | 'other';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number; // Positive for income, negative for expense
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  date: string; // ISO date
  created_at: string;
  metadata: {
    tags?: string[];
    notes?: string;
    recurring?: boolean;
  };
}

export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  by_category: Record<TransactionCategory, number>;
  transaction_count: number;
  period: string;
}

export interface TransactionManagerConfig {
  supabase_url: string;
  supabase_key: string;
}

// ============================================================================
// TRANSACTION MANAGER
// ============================================================================

export class TransactionManager {
  private supabase: SupabaseClient;

  constructor(config: TransactionManagerConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);
  }

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    try {
      // Ensure amount sign matches type
      const amount = transaction.type === 'expense' 
        ? -Math.abs(transaction.amount)
        : Math.abs(transaction.amount);

      const { data, error } = await this.supabase
        .from('transactions')
        .insert({
          ...transaction,
          amount,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create transaction error:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: string, userId: string): Promise<Transaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get transaction error:', error);
      return null;
    }
  }

  async updateTransaction(transactionId: string, userId: string, updates: Partial<Transaction>): Promise<Transaction> {
    try {
      // Ensure amount sign matches type if updating
      if (updates.amount !== undefined && updates.type) {
        updates.amount = updates.type === 'expense'
          ? -Math.abs(updates.amount)
          : Math.abs(updates.amount);
      }

      const { data, error } = await this.supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  }

  async deleteTransaction(transactionId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete transaction error:', error);
      throw error;
    }
  }

  async listTransactions(userId: string, options?: {
    type?: TransactionType;
    category?: TransactionCategory;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    try {
      let query = this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (options?.type) {
        query = query.eq('type', options.type);
      }
      if (options?.category) {
        query = query.eq('category', options.category);
      }
      if (options?.start_date) {
        query = query.gte('date', options.start_date);
      }
      if (options?.end_date) {
        query = query.lte('date', options.end_date);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('List transactions error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARIES & ANALYTICS
  // --------------------------------------------------------------------------

  async getSummary(userId: string, startDate: string, endDate: string): Promise<TransactionSummary> {
    try {
      const transactions = await this.listTransactions(userId, {
        start_date: startDate,
        end_date: endDate,
      });

      const total_income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const total_expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const net = total_income - total_expenses;

      // Group by category
      const by_category: Partial<Record<TransactionCategory, number>> = {};
      transactions.forEach(t => {
        by_category[t.category] = (by_category[t.category] || 0) + Math.abs(t.amount);
      });

      return {
        total_income,
        total_expenses,
        net,
        by_category: by_category as Record<TransactionCategory, number>,
        transaction_count: transactions.length,
        period: `${startDate} to ${endDate}`,
      };
    } catch (error) {
      console.error('Get summary error:', error);
      return {
        total_income: 0,
        total_expenses: 0,
        net: 0,
        by_category: {} as Record<TransactionCategory, number>,
        transaction_count: 0,
        period: `${startDate} to ${endDate}`,
      };
    }
  }

  async getMonthSummary(userId: string, year: number, month: number): Promise<TransactionSummary> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    return this.getSummary(userId, startDate, endDate);
  }

  async getCurrentMonthSummary(userId: string): Promise<TransactionSummary> {
    const now = new Date();
    return this.getMonthSummary(userId, now.getFullYear(), now.getMonth() + 1);
  }

  // --------------------------------------------------------------------------
  // QUICK ADD
  // --------------------------------------------------------------------------

  async quickAddExpense(
    userId: string,
    amount: number,
    description: string,
    category: TransactionCategory = 'other'
  ): Promise<Transaction> {
    return this.createTransaction({
      user_id: userId,
      amount: -Math.abs(amount),
      type: 'expense',
      category,
      description,
      date: new Date().toISOString().split('T')[0],
      metadata: {},
    });
  }

  async quickAddIncome(
    userId: string,
    amount: number,
    description: string,
    category: TransactionCategory = 'income_other'
  ): Promise<Transaction> {
    return this.createTransaction({
      user_id: userId,
      amount: Math.abs(amount),
      type: 'income',
      category,
      description,
      date: new Date().toISOString().split('T')[0],
      metadata: {},
    });
  }

  // --------------------------------------------------------------------------
  // CATEGORY HELPERS
  // --------------------------------------------------------------------------

  suggestCategory(description: string): TransactionCategory {
    const desc = description.toLowerCase();

    // Income keywords
    if (desc.includes('salary') || desc.includes('paycheck')) return 'income_salary';
    if (desc.includes('freelance') || desc.includes('contract')) return 'income_freelance';

    // Expense keywords
    if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('apartment')) return 'housing';
    if (desc.includes('gas') || desc.includes('uber') || desc.includes('lyft') || desc.includes('parking')) return 'transportation';
    if (desc.includes('restaurant') || desc.includes('coffee') || desc.includes('delivery')) return 'food_dining';
    if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('whole foods')) return 'food_groceries';
    if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone')) return 'utilities';
    if (desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('hospital')) return 'healthcare';
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) return 'subscriptions';
    if (desc.includes('movie') || desc.includes('concert') || desc.includes('game')) return 'entertainment';
    if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart')) return 'shopping';
    if (desc.includes('tuition') || desc.includes('course') || desc.includes('book')) return 'education';

    return 'other';
  }

  // --------------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------------

  async bulkCreate(transactions: Array<Omit<Transaction, 'id' | 'created_at'>>): Promise<Transaction[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await this.supabase
        .from('transactions')
        .insert(
          transactions.map(t => ({
            ...t,
            amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
            created_at: now,
          }))
        )
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Bulk create error:', error);
      return [];
    }
  }

  async bulkDelete(transactionIds: string[], userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .delete()
        .in('id', transactionIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Bulk delete error:', error);
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // SEARCH
  // --------------------------------------------------------------------------

  async searchTransactions(userId: string, searchTerm: string): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('description', `%${searchTerm}%`)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search transactions error:', error);
      return [];
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default TransactionManager;
