-- ============================================================================
-- HOLLY Feature 46: Financial Intelligence - Database Schema
-- Lean schema for transactions and budgets
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRANSACTIONS
-- Core transaction tracking
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount DECIMAL(12, 2) NOT NULL, -- Negative for expenses, positive for income
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- ----------------------------------------------------------------------------
-- BUDGETS
-- Monthly budget limits per category
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget details
  category TEXT NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL CHECK (monthly_limit > 0),
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one budget per category per period
  CONSTRAINT unique_budget_period UNIQUE (user_id, category, period_start, period_end)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to transactions"
  ON transactions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access to budgets"
  ON budgets FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to get spending by category for a period
CREATE OR REPLACE FUNCTION get_spending_by_category(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  total_spent DECIMAL,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.category,
    SUM(ABS(t.amount)) as total_spent,
    COUNT(*) as transaction_count
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date
  GROUP BY t.category
  ORDER BY total_spent DESC;
END;
$$;

-- Function to get budget status
CREATE OR REPLACE FUNCTION get_budget_status(
  p_budget_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  budget_id UUID,
  category TEXT,
  monthly_limit DECIMAL,
  spent DECIMAL,
  remaining DECIMAL,
  percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget RECORD;
  v_spent DECIMAL;
BEGIN
  -- Get budget
  SELECT * INTO v_budget
  FROM budgets
  WHERE id = p_budget_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate spending
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_spent
  FROM transactions
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND category = v_budget.category
    AND date >= v_budget.period_start
    AND date <= v_budget.period_end;
  
  RETURN QUERY
  SELECT
    v_budget.id,
    v_budget.category,
    v_budget.monthly_limit,
    v_spent,
    v_budget.monthly_limit - v_spent as remaining,
    (v_spent / v_budget.monthly_limit * 100) as percentage;
END;
$$;

-- Function to get financial summary
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_income DECIMAL,
  total_expenses DECIMAL,
  net DECIMAL,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as total_income,
    COALESCE(ABS(SUM(amount) FILTER (WHERE type = 'expense')), 0) as total_expenses,
    COALESCE(SUM(amount), 0) as net,
    COUNT(*) as transaction_count
  FROM transactions
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Update budget timestamp on change
CREATE OR REPLACE FUNCTION update_budget_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_budget_timestamp
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_timestamp();

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE transactions IS 'Financial transactions (income and expenses)';
COMMENT ON TABLE budgets IS 'Monthly budget limits per category';

COMMENT ON FUNCTION get_spending_by_category(UUID, DATE, DATE) IS 'Get spending breakdown by category';
COMMENT ON FUNCTION get_budget_status(UUID, UUID) IS 'Get current status of a budget';
COMMENT ON FUNCTION get_financial_summary(UUID, DATE, DATE) IS 'Get financial summary for a period';

-- ----------------------------------------------------------------------------
-- GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

GRANT ALL ON transactions TO service_role;
GRANT ALL ON budgets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

GRANT EXECUTE ON FUNCTION get_spending_by_category(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_budget_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_summary(UUID, DATE, DATE) TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Feature 46: Financial Intelligence - Database migration complete' AS status;
