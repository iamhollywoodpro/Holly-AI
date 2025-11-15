// Finance API - Budget and Transaction Management
// Clerk + Prisma implementation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { FinanceManager } from '@/lib/finance/finance-manager';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, data } = body;

    const finance = new FinanceManager(userId);

    switch (action) {
      case 'create_transaction':
        const transaction = await finance.createTransaction(data);
        return NextResponse.json({ 
          success: true,
          transaction
        });

      case 'set_budget':
        const budget = await finance.setBudget(data);
        return NextResponse.json({ 
          success: true,
          budget
        });

      case 'get_summary':
        const summary = await finance.getSummary(data.period || 'month');
        return NextResponse.json({ 
          success: true,
          summary
        });

      case 'delete_transaction':
        await finance.deleteTransaction(data.transactionId);
        return NextResponse.json({ 
          success: true,
          message: 'Transaction deleted'
        });

      case 'update_transaction':
        const updated = await finance.updateTransaction(data.transactionId, data.updates);
        return NextResponse.json({ 
          success: true,
          transaction: updated
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Finance API error:', error);
    return NextResponse.json(
      { error: error.message || 'Finance operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'transactions' or 'budgets'

    const finance = new FinanceManager(userId);

    if (type === 'budgets') {
      const budgets = await finance.getBudgets();
      return NextResponse.json({ 
        success: true,
        budgets
      });
    }

    // Default: get transactions
    const transactions = await finance.getTransactions();
    return NextResponse.json({ 
      success: true,
      transactions
    });
  } catch (error: any) {
    console.error('Finance API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get finance data' },
      { status: 500 }
    );
  }
}
