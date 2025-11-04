// HOLLY Feature 46: Financial Intelligence - API Routes
// Clean REST API for transactions, budgets, and insights

import { NextRequest, NextResponse } from 'next/server';
import FinanceCoordinator from '@/lib/finance/finance-coordinator';

// ============================================================================
// INITIALIZE
// ============================================================================

const getCoordinator = () => {
  return new FinanceCoordinator({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    groq_api_key: process.env.GROQ_API_KEY,
    google_api_key: process.env.GOOGLE_API_KEY,
  });
};

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { action, user_id } = body as any;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const coordinator = getCoordinator();
    const transactionManager = coordinator.getTransactionManager();
    const budgetManager = coordinator.getBudgetManager();

    switch (action) {
      // -----------------------------------------------------------------------
      // TRANSACTION OPERATIONS
      // -----------------------------------------------------------------------
      case 'create_transaction': {
        const { amount, type, category, description, date, metadata } = body as any;
        if (amount === undefined || !type || !category) {
          return NextResponse.json(
            { error: 'amount, type, and category are required' },
            { status: 400 }
          );
        }

        const transaction = await transactionManager.createTransaction({
          user_id,
          amount,
          type,
          category,
          description: description || '',
          date: date || new Date().toISOString().split('T')[0],
          metadata: metadata || {},
        });

        return NextResponse.json({ success: true, transaction });
      }

      case 'quick_add_expense': {
        const { amount, description, category } = body as any;
        const transaction = await transactionManager.quickAddExpense(
          user_id,
          amount,
          description,
          category
        );
        return NextResponse.json({ success: true, transaction });
      }

      case 'quick_add_income': {
        const { amount, description, category } = body as any;
        const transaction = await transactionManager.quickAddIncome(
          user_id,
          amount,
          description,
          category
        );
        return NextResponse.json({ success: true, transaction });
      }

      case 'update_transaction': {
        const { transaction_id, updates } = body as any;
        if (!transaction_id) {
          return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
        }

        const transaction = await transactionManager.updateTransaction(
          transaction_id,
          user_id,
          updates
        );
        return NextResponse.json({ success: true, transaction });
      }

      case 'delete_transaction': {
        const { transaction_id } = body as any;
        if (!transaction_id) {
          return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
        }

        await transactionManager.deleteTransaction(transaction_id, user_id);
        return NextResponse.json({ success: true });
      }

      case 'list_transactions': {
        const { type, category, start_date, end_date, limit } = body as any;
        const transactions = await transactionManager.listTransactions(user_id, {
          type,
          category,
          start_date,
          end_date,
          limit,
        });
        return NextResponse.json({ success: true, transactions, count: transactions.length });
      }

      case 'search_transactions': {
        const { search_term } = body as any;
        const transactions = await transactionManager.searchTransactions(user_id, search_term);
        return NextResponse.json({ success: true, transactions, count: transactions.length });
      }

      case 'get_summary': {
        const { start_date, end_date } = body as any;
        if (!start_date || !end_date) {
          return NextResponse.json(
            { error: 'start_date and end_date are required' },
            { status: 400 }
          );
        }

        const summary = await transactionManager.getSummary(user_id, start_date, end_date);
        return NextResponse.json({ success: true, summary });
      }

      case 'get_current_month_summary': {
        const summary = await transactionManager.getCurrentMonthSummary(user_id);
        return NextResponse.json({ success: true, summary });
      }

      case 'suggest_category': {
        const { description } = body as any;
        const category = transactionManager.suggestCategory(description);
        return NextResponse.json({ success: true, category });
      }

      // -----------------------------------------------------------------------
      // BUDGET OPERATIONS
      // -----------------------------------------------------------------------
      case 'create_budget': {
        const { category, monthly_limit, period_start, period_end } = body as any;
        if (!category || !monthly_limit || !period_start || !period_end) {
          return NextResponse.json(
            { error: 'category, monthly_limit, period_start, and period_end are required' },
            { status: 400 }
          );
        }

        const budget = await budgetManager.createBudget({
          user_id,
          category,
          monthly_limit,
          period_start,
          period_end,
        });

        return NextResponse.json({ success: true, budget });
      }

      case 'create_monthly_budget': {
        const { category, monthly_limit } = body as any;
        if (!category || !monthly_limit) {
          return NextResponse.json(
            { error: 'category and monthly_limit are required' },
            { status: 400 }
          );
        }

        const budget = await budgetManager.createMonthlyBudget(user_id, category, monthly_limit);
        return NextResponse.json({ success: true, budget });
      }

      case 'setup_default_budgets': {
        const { monthly_income } = body as any;
        if (!monthly_income) {
          return NextResponse.json({ error: 'monthly_income is required' }, { status: 400 });
        }

        const budgets = await budgetManager.setupDefaultBudgets(user_id, monthly_income);
        return NextResponse.json({ success: true, budgets, count: budgets.length });
      }

      case 'update_budget': {
        const { budget_id, updates } = body as any;
        if (!budget_id) {
          return NextResponse.json({ error: 'budget_id is required' }, { status: 400 });
        }

        const budget = await budgetManager.updateBudget(budget_id, user_id, updates);
        return NextResponse.json({ success: true, budget });
      }

      case 'delete_budget': {
        const { budget_id } = body as any;
        if (!budget_id) {
          return NextResponse.json({ error: 'budget_id is required' }, { status: 400 });
        }

        await budgetManager.deleteBudget(budget_id, user_id);
        return NextResponse.json({ success: true });
      }

      case 'list_budgets': {
        const { category, active_only } = body as any;
        const budgets = await budgetManager.listBudgets(user_id, { category, active_only });
        return NextResponse.json({ success: true, budgets, count: budgets.length });
      }

      case 'get_budget_status': {
        const { budget_id } = body as any;
        if (!budget_id) {
          return NextResponse.json({ error: 'budget_id is required' }, { status: 400 });
        }

        const status = await budgetManager.getBudgetStatus(budget_id, user_id);
        return NextResponse.json({ success: true, status });
      }

      case 'get_all_budget_statuses': {
        const statuses = await budgetManager.getAllBudgetStatuses(user_id);
        return NextResponse.json({ success: true, statuses, count: statuses.length });
      }

      case 'get_budget_alerts': {
        const alerts = await budgetManager.getBudgetAlerts(user_id);
        return NextResponse.json({ success: true, alerts, count: alerts.length });
      }

      case 'check_can_afford': {
        const { category, amount } = body as any;
        if (!category || !amount) {
          return NextResponse.json(
            { error: 'category and amount are required' },
            { status: 400 }
          );
        }

        const result = await budgetManager.checkCanAfford(user_id, category, amount);
        return NextResponse.json({ success: true, ...result });
      }

      // -----------------------------------------------------------------------
      // INSIGHTS & ANALYTICS
      // -----------------------------------------------------------------------
      case 'get_financial_health': {
        const health = await coordinator.getFinancialHealth(user_id);
        return NextResponse.json({ success: true, health });
      }

      case 'get_insights': {
        const insights = await coordinator.getInsights(user_id);
        return NextResponse.json({ success: true, insights });
      }

      case 'get_dashboard': {
        const dashboard = await coordinator.getDashboard(user_id);
        return NextResponse.json({ success: true, dashboard });
      }

      // -----------------------------------------------------------------------
      // UNKNOWN ACTION
      // -----------------------------------------------------------------------
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Finance API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const action = searchParams.get('action');

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const coordinator = getCoordinator();

    switch (action) {
      case 'get_dashboard': {
        const dashboard = await coordinator.getDashboard(user_id);
        return NextResponse.json({ success: true, dashboard });
      }

      case 'get_current_month_summary': {
        const summary = await coordinator.getTransactionManager().getCurrentMonthSummary(user_id);
        return NextResponse.json({ success: true, summary });
      }

      case 'get_financial_health': {
        const health = await coordinator.getFinancialHealth(user_id);
        return NextResponse.json({ success: true, health });
      }

      case 'get_insights': {
        const insights = await coordinator.getInsights(user_id);
        return NextResponse.json({ success: true, insights });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Finance API GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
