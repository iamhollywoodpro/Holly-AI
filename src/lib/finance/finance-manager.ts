// Finance Manager - REAL Prisma Implementation
// Manages budgets, transactions, and financial tracking using actual database

import { prisma } from '@/lib/db';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'income' | 'expense';
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  amount: number;
  spent: number;
  period: string;
}

export class FinanceManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Create a new transaction in the database
   */
  async createTransaction(data: {
    amount: number;
    category: string;
    description: string;
    type: 'income' | 'expense';
    date?: Date;
    budgetId?: string;
  }): Promise<Transaction> {
    const txn = await prisma.transaction.create({
      data: {
        userId: this.userId,
        amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
        description: data.description,
        category: data.category,
        budgetId: data.budgetId,
      },
    });

    // Update budget spent amount if linked
    if (data.budgetId && data.type === 'expense') {
      await prisma.budget.update({
        where: { id: data.budgetId },
        data: { spent: { increment: Math.abs(data.amount) } },
      }).catch(() => {});
    }

    return {
      id: txn.id,
      userId: txn.userId,
      amount: txn.amount,
      category: txn.category,
      description: txn.description,
      date: txn.createdAt,
      type: txn.amount >= 0 ? 'income' : 'expense',
    };
  }

  /**
   * Get all transactions from the database
   */
  async getTransactions(filters?: {
    category?: string;
    type?: 'income' | 'expense';
    startDate?: Date;
    endDate?: Date;
  }): Promise<Transaction[]> {
    const where: Record<string, unknown> = { userId: this.userId };

    if (filters?.category) where.category = filters.category;
    if (filters?.type === 'income') where.amount = { gt: 0 };
    else if (filters?.type === 'expense') where.amount = { lt: 0 };
    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters?.startDate) createdAt.gte = filters.startDate;
      if (filters?.endDate) createdAt.lte = filters.endDate;
      where.createdAt = createdAt;
    }

    const txns = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return txns.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.createdAt,
      type: t.amount >= 0 ? 'income' as const : 'expense' as const,
    }));
  }

  /**
   * Create or update a budget in the database
   */
  async setBudget(data: {
    name: string;
    amount: number;
    period: string;
  }): Promise<Budget> {
    // Check if budget with same name exists
    const existing = await prisma.budget.findFirst({
      where: { userId: this.userId, name: data.name },
    });

    if (existing) {
      const updated = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount: data.amount, period: data.period },
      });
      return {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        amount: updated.amount,
        spent: updated.spent,
        period: updated.period,
      };
    }

    const budget = await prisma.budget.create({
      data: {
        userId: this.userId,
        name: data.name,
        amount: data.amount,
        period: data.period,
      },
    });

    return {
      id: budget.id,
      userId: budget.userId,
      name: budget.name,
      amount: budget.amount,
      spent: budget.spent,
      period: budget.period,
    };
  }

  /**
   * Get all budgets from the database
   */
  async getBudgets(): Promise<Budget[]> {
    const budgets = await prisma.budget.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
    });

    return budgets.map(b => ({
      id: b.id,
      userId: b.userId,
      name: b.name,
      amount: b.amount,
      spent: b.spent,
      period: b.period,
    }));
  }

  /**
   * Get financial summary computed from REAL data
   */
  async getSummary(): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    budgetUtilization: number;
    topCategories: Array<{ category: string; total: number }>;
  }> {
    const [income, expenses, budgets, categoryTotals] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: this.userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: this.userId, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({ where: { userId: this.userId } }),
      prisma.transaction.groupBy({
        by: ['category'],
        where: { userId: this.userId },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const totalIncome = income._sum.amount ?? 0;
    const totalExpenses = Math.abs(expenses._sum.amount ?? 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      topCategories: categoryTotals.slice(0, 10).map(c => ({
        category: c.category,
        total: c._sum.amount ?? 0,
      })),
    };
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string): Promise<void> {
    const txn = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.userId !== this.userId) {
      throw new Error('Transaction not found or unauthorized');
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    // Revert budget spent amount if linked
    if (txn.budgetId && txn.amount < 0) {
      await prisma.budget.update({
        where: { id: txn.budgetId },
        data: { spent: { decrement: Math.abs(txn.amount) } },
      }).catch(() => {});
    }
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    transactionId: string,
    updates: {
      amount?: number;
      category?: string;
      description?: string;
      type?: 'income' | 'expense';
    }
  ): Promise<Transaction> {
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!existing || existing.userId !== this.userId) {
      throw new Error('Transaction not found or unauthorized');
    }

    const data: Record<string, any> = {};
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.category !== undefined) data.category = updates.category;
    
    let newAmount = existing.amount;
    if (updates.amount !== undefined) {
      const type = updates.type || (existing.amount >= 0 ? 'income' : 'expense');
      newAmount = type === 'expense' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
      data.amount = newAmount;
    } else if (updates.type !== undefined) {
      newAmount = updates.type === 'expense' ? -Math.abs(existing.amount) : Math.abs(existing.amount);
      data.amount = newAmount;
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data,
    });

    // Adjust budget spent if amount or budgetId changed
    if (existing.budgetId && existing.amount < 0) {
      // Revert old budget
      await prisma.budget.update({
        where: { id: existing.budgetId },
        data: { spent: { decrement: Math.abs(existing.amount) } },
      }).catch(() => {});
    }

    if (existing.budgetId && newAmount < 0) {
      // Apply new budget amount
      await prisma.budget.update({
        where: { id: existing.budgetId },
        data: { spent: { increment: Math.abs(newAmount) } },
      }).catch(() => {});
    }

    return {
      id: updated.id,
      userId: updated.userId,
      amount: updated.amount,
      category: updated.category,
      description: updated.description,
      date: updated.createdAt,
      type: updated.amount >= 0 ? 'income' : 'expense',
    };
  }
}
