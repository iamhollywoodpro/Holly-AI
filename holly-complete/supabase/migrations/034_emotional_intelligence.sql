-- ============================================================================
-- HOLLY Feature 44: Emotional Intelligence - Database Schema
-- Tables for emotion tracking, baselines, and pattern detection
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EMOTION LOGS
-- Track every emotional analysis for pattern detection
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS emotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message context
  message_text TEXT NOT NULL,
  
  -- Emotion analysis
  primary_emotion TEXT NOT NULL,
  secondary_emotions TEXT[] DEFAULT '{}',
  intensity FLOAT NOT NULL CHECK (intensity >= 0 AND intensity <= 1),
  sentiment_score FLOAT NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Support indicators
  needs_support BOOLEAN DEFAULT FALSE,
  stress_level FLOAT NOT NULL CHECK (stress_level >= 0 AND stress_level <= 1),
  energy_level FLOAT NOT NULL CHECK (energy_level >= 0 AND energy_level <= 1),
  
  -- Context
  context JSONB DEFAULT '{}'::jsonb,
  suggested_response_tone TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT emotion_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_id ON emotion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_created_at ON emotion_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_user_created ON emotion_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_primary_emotion ON emotion_logs(primary_emotion);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_needs_support ON emotion_logs(needs_support) WHERE needs_support = TRUE;

-- ----------------------------------------------------------------------------
-- EMOTIONAL BASELINES
-- Store user's emotional baseline and patterns
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS emotional_baselines (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Baseline metrics
  baseline_sentiment FLOAT NOT NULL DEFAULT 0,
  common_emotions TEXT[] DEFAULT '{}',
  stress_indicators TEXT[] DEFAULT '{}',
  
  -- Energy patterns
  energy_patterns JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{"time_of_day": "14:00", "average_energy": 0.7}, ...]
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT emotional_baselines_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_emotional_baselines_user_id ON emotional_baselines(user_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE emotion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_baselines ENABLE ROW LEVEL SECURITY;

-- Users can only access their own emotion logs
CREATE POLICY "Users can view own emotion logs"
  ON emotion_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emotion logs"
  ON emotion_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emotion logs"
  ON emotion_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emotion logs"
  ON emotion_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all emotion logs
CREATE POLICY "Service role full access to emotion logs"
  ON emotion_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can only access their own baseline
CREATE POLICY "Users can view own baseline"
  ON emotional_baselines
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own baseline"
  ON emotional_baselines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baseline"
  ON emotional_baselines
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own baseline"
  ON emotional_baselines
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all baselines
CREATE POLICY "Service role full access to baselines"
  ON emotional_baselines
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to clean old emotion logs (keep last 90 days)
CREATE OR REPLACE FUNCTION clean_old_emotion_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM emotion_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Function to get emotion stats for a user
CREATE OR REPLACE FUNCTION get_emotion_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_messages BIGINT,
  dominant_emotion TEXT,
  avg_sentiment FLOAT,
  avg_stress FLOAT,
  avg_energy FLOAT,
  support_needed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_messages,
    MODE() WITHIN GROUP (ORDER BY primary_emotion) as dominant_emotion,
    AVG(sentiment_score) as avg_sentiment,
    AVG(stress_level) as avg_stress,
    AVG(energy_level) as avg_energy,
    COUNT(*) FILTER (WHERE needs_support = TRUE) as support_needed_count
  FROM emotion_logs
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- Function to detect emotional patterns
CREATE OR REPLACE FUNCTION detect_emotional_patterns(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  dominant_emotion TEXT,
  avg_sentiment FLOAT,
  stress_trend TEXT,
  energy_trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mid INTEGER;
  v_first_half_stress FLOAT;
  v_second_half_stress FLOAT;
  v_first_half_energy FLOAT;
  v_second_half_energy FLOAT;
  v_stress_diff FLOAT;
  v_energy_diff FLOAT;
BEGIN
  v_mid := p_limit / 2;
  
  -- Calculate first half stress
  SELECT AVG(stress_level) INTO v_first_half_stress
  FROM (
    SELECT stress_level
    FROM emotion_logs
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT v_mid
  ) first_half;
  
  -- Calculate second half stress
  SELECT AVG(stress_level) INTO v_second_half_stress
  FROM (
    SELECT stress_level
    FROM emotion_logs
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    OFFSET v_mid
    LIMIT v_mid
  ) second_half;
  
  -- Calculate first half energy
  SELECT AVG(energy_level) INTO v_first_half_energy
  FROM (
    SELECT energy_level
    FROM emotion_logs
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT v_mid
  ) first_half;
  
  -- Calculate second half energy
  SELECT AVG(energy_level) INTO v_second_half_energy
  FROM (
    SELECT energy_level
    FROM emotion_logs
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    OFFSET v_mid
    LIMIT v_mid
  ) second_half;
  
  v_stress_diff := COALESCE(v_first_half_stress, 0) - COALESCE(v_second_half_stress, 0);
  v_energy_diff := COALESCE(v_first_half_energy, 0) - COALESCE(v_second_half_energy, 0);
  
  RETURN QUERY
  SELECT
    MODE() WITHIN GROUP (ORDER BY primary_emotion) as dominant_emotion,
    AVG(sentiment_score) as avg_sentiment,
    CASE
      WHEN v_stress_diff > 0.1 THEN 'increasing'::TEXT
      WHEN v_stress_diff < -0.1 THEN 'decreasing'::TEXT
      ELSE 'stable'::TEXT
    END as stress_trend,
    CASE
      WHEN v_energy_diff > 0.1 THEN 'increasing'::TEXT
      WHEN v_energy_diff < -0.1 THEN 'decreasing'::TEXT
      ELSE 'stable'::TEXT
    END as energy_trend
  FROM emotion_logs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Update baseline timestamp on change
CREATE OR REPLACE FUNCTION update_baseline_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_baseline_timestamp
  BEFORE UPDATE ON emotional_baselines
  FOR EACH ROW
  EXECUTE FUNCTION update_baseline_timestamp();

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE emotion_logs IS 'Tracks all emotional analyses for users';
COMMENT ON TABLE emotional_baselines IS 'Stores user emotional baselines and patterns';
COMMENT ON FUNCTION clean_old_emotion_logs() IS 'Cleans emotion logs older than 90 days';
COMMENT ON FUNCTION get_emotion_stats(UUID, INTEGER) IS 'Gets emotion statistics for a user';
COMMENT ON FUNCTION detect_emotional_patterns(UUID, INTEGER) IS 'Detects emotional patterns and trends';

-- ----------------------------------------------------------------------------
-- GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

-- Grant service role full access
GRANT ALL ON emotion_logs TO service_role;
GRANT ALL ON emotional_baselines TO service_role;

-- Grant authenticated users select on their own data (enforced by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON emotion_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emotional_baselines TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_emotion_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_emotional_patterns(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Migration complete
SELECT 'Feature 44: Emotional Intelligence - Database migration complete' AS status;
