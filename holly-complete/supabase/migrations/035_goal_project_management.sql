-- ============================================================================
-- HOLLY Feature 45: Goal & Project Management - Database Schema
-- Tables for projects, goals, milestones, and dependencies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROJECTS
-- Top-level grouping for goals
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  
  -- Visual
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '📊',
  
  -- Timeline
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

-- ----------------------------------------------------------------------------
-- GOALS
-- Individual goals within projects
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('career', 'personal', 'health', 'financial', 'learning', 'creative', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Status & progress
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Timeline
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline) WHERE deadline IS NOT NULL;

-- ----------------------------------------------------------------------------
-- MILESTONES
-- Steps within a goal
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  "order" INTEGER DEFAULT 0,
  
  -- Completion
  completed BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones(completed);

-- ----------------------------------------------------------------------------
-- GOAL DEPENDENCIES
-- Track dependencies between goals
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goal_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  depends_on_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocks', 'related_to')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent circular dependencies at DB level (partial)
  CONSTRAINT no_self_dependency CHECK (goal_id != depends_on_goal_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_dependencies_goal_id ON goal_dependencies(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_dependencies_depends_on ON goal_dependencies(depends_on_goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_dependencies_user_id ON goal_dependencies(user_id);

-- Unique constraint: prevent duplicate dependencies
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_goal_dependency 
  ON goal_dependencies(goal_id, depends_on_goal_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_dependencies ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE USING (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE USING (auth.uid() = user_id);

-- Milestones policies
CREATE POLICY "Users can view own milestones"
  ON milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own milestones"
  ON milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones"
  ON milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own milestones"
  ON milestones FOR DELETE USING (auth.uid() = user_id);

-- Dependencies policies
CREATE POLICY "Users can view own dependencies"
  ON goal_dependencies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dependencies"
  ON goal_dependencies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own dependencies"
  ON goal_dependencies FOR DELETE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to projects"
  ON projects FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access to goals"
  ON goals FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access to milestones"
  ON milestones FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access to dependencies"
  ON goal_dependencies FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to update project progress when goals change
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if goal has a project_id
  IF (NEW.project_id IS NOT NULL) OR (OLD.project_id IS NOT NULL) THEN
    UPDATE projects
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update project when goal changes
CREATE TRIGGER trigger_update_project_progress
  AFTER INSERT OR UPDATE OR DELETE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();

-- Function to auto-update goal progress when milestones complete
CREATE OR REPLACE FUNCTION update_goal_progress_from_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_milestones INTEGER;
  v_completed_milestones INTEGER;
  v_new_progress INTEGER;
BEGIN
  -- Count milestones for this goal
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = TRUE)
  INTO v_total_milestones, v_completed_milestones
  FROM milestones
  WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id);
  
  -- Calculate new progress
  IF v_total_milestones > 0 THEN
    v_new_progress := (v_completed_milestones * 100) / v_total_milestones;
    
    -- Update goal progress
    UPDATE goals
    SET 
      progress = v_new_progress,
      updated_at = NOW()
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update goal progress when milestone changes
CREATE TRIGGER trigger_update_goal_progress
  AFTER INSERT OR UPDATE OR DELETE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress_from_milestones();

-- Function to get project health score
CREATE OR REPLACE FUNCTION get_project_health(p_project_id UUID)
RETURNS TABLE (
  health_score INTEGER,
  total_goals INTEGER,
  completed_goals INTEGER,
  overdue_goals INTEGER,
  stalled_goals INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 100;
BEGIN
  -- Get goal counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE deadline < NOW() AND status NOT IN ('completed', 'cancelled')),
    COUNT(*) FILTER (WHERE status = 'in_progress' AND updated_at < NOW() - INTERVAL '7 days')
  INTO total_goals, completed_goals, overdue_goals, stalled_goals
  FROM goals
  WHERE project_id = p_project_id;
  
  -- Calculate health score
  v_score := v_score - (overdue_goals * 10);
  v_score := v_score - (stalled_goals * 5);
  
  IF total_goals > 5 AND completed_goals = 0 THEN
    v_score := v_score - 10;
  END IF;
  
  health_score := GREATEST(0, LEAST(100, v_score));
  
  RETURN NEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS FOR TIMESTAMPS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_projects_timestamp
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_goals_timestamp
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_milestones_timestamp
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE projects IS 'Top-level project grouping for goals';
COMMENT ON TABLE goals IS 'Individual goals within projects';
COMMENT ON TABLE milestones IS 'Milestones within goals';
COMMENT ON TABLE goal_dependencies IS 'Dependencies between goals';

COMMENT ON FUNCTION update_project_progress() IS 'Updates project timestamp when goals change';
COMMENT ON FUNCTION update_goal_progress_from_milestones() IS 'Auto-updates goal progress when milestones complete';
COMMENT ON FUNCTION get_project_health(UUID) IS 'Calculates project health score';

-- ----------------------------------------------------------------------------
-- GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

GRANT ALL ON projects TO service_role;
GRANT ALL ON goals TO service_role;
GRANT ALL ON milestones TO service_role;
GRANT ALL ON goal_dependencies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON milestones TO authenticated;
GRANT SELECT, INSERT, DELETE ON goal_dependencies TO authenticated;

GRANT EXECUTE ON FUNCTION get_project_health(UUID) TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Feature 45: Goal & Project Management - Database migration complete' AS status;
