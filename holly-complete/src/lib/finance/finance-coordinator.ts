// HOLLY Feature 46: Financial Intelligence - Finance Coordinator
// AI-powered insights and financial health analysis

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import TransactionManager, { Transaction, TransactionSummary } from './transaction-manager';
import BudgetManager, { BudgetStatus } from './budget-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface FinanceCoordinatorConfig {
  supabase_url: string;
  supabase_key: string;
  groq_api_key?: string;
  google_api_key?: string;
}

export interface FinancialInsights {
  health_score: number; // 0-100
  spending_trends: string[];
  savings_opportunities: string[];
  warnings: string[];
  recommendations: string[];
  summary: string;
}

export interface FinancialHealth {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  factors: {
    savings_rate: number;
    budget_adherence: number;
    spending_consistency: number;
    income_stability: number;
  };
}

// ============================================================================
// FINANCE COORDINATOR
// ============================================================================

export class FinanceCoordinator {
  private supabase: SupabaseClient;
  private transactionManager: TransactionManager;
  private budgetManager: BudgetManager;
  private groq: Groq | null = null;
  private gemini: GoogleGenerativeAI | null = null;

  constructor(config: FinanceCoordinatorConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);

    this.transactionManager = new TransactionManager({
      supabase_url: config.supabase_url,
      supabase_key: config.supabase_key,
    });

    this.budgetManager = new BudgetManager({
      supabase_url: config.supabase_url,
      supabase_key: config.supabase_key,
    });

    // Initialize AI
    if (config.groq_api_key) {
      this.groq = new Groq({ apiKey: config.groq_api_key });
    }
    if (config.google_api_key) {
      this.gemini = new GoogleGenerativeAI(config.google_api_key);
    }
  }

  // --------------------------------------------------------------------------
  // FINANCIAL HEALTH ANALYSIS
  // --------------------------------------------------------------------------

  async getFinancialHealth(userId: string): Promise<FinancialHealth> {
    try {
      const summary = await this.transactionManager.getCurrentMonthSummary(userId);
      const budgetStatuses = await this.budgetManager.getAllBudgetStatuses(userId);

      // Calculate factors
      const savings_rate = summary.total_income > 0
        ? ((summary.net / summary.total_income) * 100)
        : 0;

      const budget_adherence = budgetStatuses.length > 0
        ? (budgetStatuses.filter(b => !b.is_over_budget).length / budgetStatuses.length) * 100
        : 100;

      const spending_consistency = 70; // Simplified - would need historical data

      const income_stability = 80; // Simplified - would need historical data

      // Calculate overall score
      const score = Math.round(
        savings_rate * 0.3 +
        budget_adherence * 0.4 +
        spending_consistency * 0.15 +
        income_stability * 0.15
      );

      let status: 'excellent' | 'good' | 'fair' | 'poor';
      if (score >= 80) status = 'excellent';
      else if (score >= 60) status = 'good';
      else if (score >= 40) status = 'fair';
      else status = 'poor';

      return {
        score,
        status,
        factors: {
          savings_rate,
          budget_adherence,
          spending_consistency,
          income_stability,
        },
      };
    } catch (error) {
      console.error('Get financial health error:', error);
      return {
        score: 50,
        status: 'fair',
        factors: {
          savings_rate: 0,
          budget_adherence: 0,
          spending_consistency: 0,
          income_stability: 0,
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // AI-POWERED INSIGHTS
  // --------------------------------------------------------------------------

  async getInsights(userId: string): Promise<FinancialInsights> {
    try {
      const summary = await this.transactionManager.getCurrentMonthSummary(userId);
      const budgetStatuses = await this.budgetManager.getAllBudgetStatuses(userId);
      const health = await this.getFinancialHealth(userId);

      const prompt = `You are a financial advisor. Analyze this person's finances and provide actionable insights.

Financial Data:
- Income: $${summary.total_income.toFixed(2)}
- Expenses: $${summary.total_expenses.toFixed(2)}
- Net: $${summary.net.toFixed(2)}
- Savings Rate: ${health.factors.savings_rate.toFixed(1)}%
- Health Score: ${health.score}/100 (${health.status})
- Budget Adherence: ${health.factors.budget_adherence.toFixed(1)}%

Budget Status:
${budgetStatuses.map(b => `- ${b.budget.category}: $${b.spent.toFixed(2)} / $${b.budget.monthly_limit} (${b.percentage.toFixed(0)}%)`).join('\n')}

Top Spending Categories:
${Object.entries(summary.by_category)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`)
  .join('\n')}

Provide JSON response:
{
  "spending_trends": ["trend 1", "trend 2", "trend 3"],
  "savings_opportunities": ["opportunity 1", "opportunity 2"],
  "warnings": ["warning 1", "warning 2"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "summary": "One sentence overall assessment"
}

Be specific and actionable.`;

      let result = '';

      if (this.groq) {
        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        });
        result = completion.choices[0]?.message?.content || '{}';
      } else if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent(prompt);
        result = response.response.text();
      } else {
        // Fallback to basic analysis
        return this.getBasicInsights(summary, budgetStatuses, health);
      }

      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        health_score: health.score,
        spending_trends: parsed.spending_trends || [],
        savings_opportunities: parsed.savings_opportunities || [],
        warnings: parsed.warnings || [],
        recommendations: parsed.recommendations || [],
        summary: parsed.summary || 'Financial health is being monitored.',
      };
    } catch (error) {
      console.error('Get insights error:', error);
      const summary = await this.transactionManager.getCurrentMonthSummary(userId);
      const budgetStatuses = await this.budgetManager.getAllBudgetStatuses(userId);
      const health = await this.getFinancialHealth(userId);
      return this.getBasicInsights(summary, budgetStatuses, health);
    }
  }

  private getBasicInsights(
    summary: TransactionSummary,
    budgetStatuses: BudgetStatus[],
    health: FinancialHealth
  ): FinancialInsights {
    const insights: FinancialInsights = {
      health_score: health.score,
      spending_trends: [],
      savings_opportunities: [],
      warnings: [],
      recommendations: [],
      summary: '',
    };

    // Analyze spending
    const topSpending = Object.entries(summary.by_category)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topSpending.length > 0) {
      insights.spending_trends.push(
        `Top spending: ${topSpending.map(([cat, amt]) => `${cat} ($${amt.toFixed(0)})`).join(', ')}`
      );
    }

    // Check savings rate
    const savingsRate = summary.total_income > 0 ? (summary.net / summary.total_income) * 100 : 0;
    if (savingsRate < 10) {
      insights.warnings.push('Savings rate is below 10% - aim for at least 20%');
      insights.savings_opportunities.push('Reduce discretionary spending to increase savings');
    }

    // Check over-budget categories
    const overBudget = budgetStatuses.filter(b => b.is_over_budget);
    if (overBudget.length > 0) {
      insights.warnings.push(`${overBudget.length} categories over budget`);
      overBudget.forEach(b => {
        insights.recommendations.push(`Reduce ${b.budget.category} spending by $${Math.abs(b.remaining).toFixed(2)}`);
      });
    }

    // General recommendations
    if (health.score < 60) {
      insights.recommendations.push('Focus on building an emergency fund');
      insights.recommendations.push('Review and cut unnecessary subscriptions');
    }

    insights.summary = health.status === 'excellent'
      ? 'Excellent financial health! Keep up the great work! 🎉'
      : health.status === 'good'
      ? 'Good financial health with room for improvement 👍'
      : health.status === 'fair'
      ? 'Financial health needs attention - follow recommendations'
      : 'Critical financial health - immediate action needed ⚠️';

    return insights;
  }

  // --------------------------------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------------------------------

  async getDashboard(userId: string): Promise<{
    current_month: TransactionSummary;
    budget_statuses: BudgetStatus[];
    financial_health: FinancialHealth;
    insights: FinancialInsights;
    recent_transactions: Transaction[];
    alerts: any[];
  }> {
    try {
      const [current_month, budget_statuses, financial_health, insights, recent_transactions, alerts] = await Promise.all([
        this.transactionManager.getCurrentMonthSummary(userId),
        this.budgetManager.getAllBudgetStatuses(userId),
        this.getFinancialHealth(userId),
        this.getInsights(userId),
        this.transactionManager.listTransactions(userId, { limit: 10 }),
        this.budgetManager.getBudgetAlerts(userId),
      ]);

      return {
        current_month,
        budget_statuses,
        financial_health,
        insights,
        recent_transactions,
        alerts,
      };
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  getTransactionManager(): TransactionManager {
    return this.transactionManager;
  }

  getBudgetManager(): BudgetManager {
    return this.budgetManager;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default FinanceCoordinator;
