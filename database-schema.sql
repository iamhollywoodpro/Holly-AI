-- ============================================================================
-- HOLLY Database Schema
-- ============================================================================
-- PostgreSQL 15 schema for Supabase
-- Project: HOLLY SUPER AGENT (npypueptfceqyzklgclm)
-- 
-- Tables:
--   1. users - User profiles and preferences
--   2. conversations - Chat history with HOLLY
--   3. code_history - Generated code records
--   4. deployments - Deployment records (GitHub, WHC)
--   5. audit_logs - Security and ethics logs
-- 
-- Features:
--   - Row Level Security (RLS)
--   - Automatic timestamps
--   - Indexes for performance
--   - Foreign key constraints
--   - Triggers for updated_at
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing (future use)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    
    -- Authentication (for future NextAuth integration)
    email_verified BOOLEAN DEFAULT FALSE,
    image TEXT,
    
    -- Preferences
    preferences JSONB DEFAULT '{
        "theme": "dark",
        "language": "en",
        "codeStyle": {
            "indent": "spaces",
            "indentSize": 2,
            "quotes": "single",
            "semicolons": true
        },
        "aiProvider": "groq",
        "notifications": true
    }'::jsonb,
    
    -- Usage tracking
    total_conversations INTEGER DEFAULT 0,
    total_code_generations INTEGER DEFAULT 0,
    total_deployments INTEGER DEFAULT 0,
    
    -- Ethics tracking
    violation_count INTEGER DEFAULT 0,
    last_violation_at TIMESTAMPTZ,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT violation_count_positive CHECK (violation_count >= 0)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = TRUE;

-- Comments
COMMENT ON TABLE users IS 'User profiles and preferences';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB';
COMMENT ON COLUMN users.violation_count IS 'Number of ethics violations';

-- ============================================================================
-- 2. CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversation details
    title TEXT,
    
    -- Messages stored as JSONB array
    messages JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ role: 'user|assistant', content: string, timestamp: string, emotion?: {...} }]
    
    -- Emotion tracking
    primary_emotion TEXT,
    emotion_intensity NUMERIC(3,2),
    emotion_confidence NUMERIC(3,2),
    
    -- Context
    context JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    message_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT emotion_intensity_range CHECK (emotion_intensity >= 0 AND emotion_intensity <= 1),
    CONSTRAINT emotion_confidence_range CHECK (emotion_confidence >= 0 AND emotion_confidence <= 1),
    CONSTRAINT message_count_positive CHECK (message_count >= 0)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_emotion ON conversations(primary_emotion);

-- GIN index for JSONB searching
CREATE INDEX IF NOT EXISTS idx_conversations_messages_gin ON conversations USING GIN(messages);
CREATE INDEX IF NOT EXISTS idx_conversations_context_gin ON conversations USING GIN(context);

-- Comments
COMMENT ON TABLE conversations IS 'Chat conversations with HOLLY';
COMMENT ON COLUMN conversations.messages IS 'Array of messages in JSONB format';
COMMENT ON COLUMN conversations.primary_emotion IS 'Detected primary emotion in conversation';

-- ============================================================================
-- 3. CODE_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS code_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Code generation details
    prompt TEXT NOT NULL,
    language TEXT NOT NULL,
    template TEXT,
    
    -- Generated code
    code TEXT NOT NULL,
    filename TEXT,
    
    -- Optional outputs
    tests TEXT,
    documentation TEXT,
    
    -- Metadata
    dependencies TEXT[],
    warnings TEXT[],
    suggestions TEXT[],
    estimated_complexity TEXT CHECK (estimated_complexity IN ('low', 'medium', 'high')),
    
    -- Security analysis
    security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
    security_passed BOOLEAN,
    security_issues JSONB DEFAULT '[]'::jsonb,
    
    -- Ethics check
    ethics_score INTEGER CHECK (ethics_score >= 0 AND ethics_score <= 100),
    ethics_approved BOOLEAN,
    ethics_violations JSONB DEFAULT '[]'::jsonb,
    
    -- Generation settings
    optimization_level TEXT CHECK (optimization_level IN ('basic', 'standard', 'aggressive')),
    include_tests BOOLEAN DEFAULT FALSE,
    include_docs BOOLEAN DEFAULT FALSE,
    
    -- AI provider used
    ai_provider TEXT DEFAULT 'claude',
    model TEXT,
    
    -- Usage stats
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    
    -- Status
    is_deployed BOOLEAN DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    deployment_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT language_valid CHECK (language IN ('javascript', 'typescript', 'python', 'nodejs', 'react', 'html', 'css', 'sql', 'php')),
    CONSTRAINT tokens_used_positive CHECK (tokens_used >= 0),
    CONSTRAINT generation_time_positive CHECK (generation_time_ms >= 0)
);

-- Indexes for code_history
CREATE INDEX IF NOT EXISTS idx_code_history_user_id ON code_history(user_id);
CREATE INDEX IF NOT EXISTS idx_code_history_conversation_id ON code_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_code_history_created_at ON code_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_history_language ON code_history(language);
CREATE INDEX IF NOT EXISTS idx_code_history_is_deployed ON code_history(is_deployed) WHERE is_deployed = TRUE;
CREATE INDEX IF NOT EXISTS idx_code_history_security_score ON code_history(security_score DESC);

-- Full-text search on prompt and code
CREATE INDEX IF NOT EXISTS idx_code_history_prompt_search ON code_history USING GIN(to_tsvector('english', prompt));
CREATE INDEX IF NOT EXISTS idx_code_history_code_search ON code_history USING GIN(to_tsvector('english', code));

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_code_history_security_issues_gin ON code_history USING GIN(security_issues);
CREATE INDEX IF NOT EXISTS idx_code_history_ethics_violations_gin ON code_history USING GIN(ethics_violations);

-- Comments
COMMENT ON TABLE code_history IS 'History of code generation requests';
COMMENT ON COLUMN code_history.security_score IS 'Security scan score (0-100)';
COMMENT ON COLUMN code_history.ethics_score IS 'Ethics check score (0-100)';

-- ============================================================================
-- 4. DEPLOYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_history_id UUID REFERENCES code_history(id) ON DELETE SET NULL,
    
    -- Deployment details
    deployment_type TEXT NOT NULL CHECK (deployment_type IN ('github', 'whc', 'vercel', 'netlify', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
    
    -- Target information
    target_url TEXT,
    repository_name TEXT,
    branch_name TEXT DEFAULT 'main',
    
    -- Files deployed
    files JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ path: string, content: string, size: number }]
    
    -- Deployment results
    commit_sha TEXT,
    deployment_url TEXT,
    
    -- Backup information
    backup_id TEXT,
    backup_created_at TIMESTAMPTZ,
    
    -- Health check
    health_check_passed BOOLEAN,
    health_check_status_code INTEGER,
    health_check_response_time INTEGER,
    
    -- Error information
    error_message TEXT,
    error_details JSONB,
    
    -- Rollback information
    rolled_back_from UUID REFERENCES deployments(id),
    rollback_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT health_check_status_valid CHECK (health_check_status_code >= 100 AND health_check_status_code < 600)
);

-- Indexes for deployments
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_code_history_id ON deployments(code_history_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_type ON deployments(deployment_type);
CREATE INDEX IF NOT EXISTS idx_deployments_repository ON deployments(repository_name);

-- GIN index for files JSONB
CREATE INDEX IF NOT EXISTS idx_deployments_files_gin ON deployments USING GIN(files);

-- Comments
COMMENT ON TABLE deployments IS 'Deployment history for GitHub and WHC';
COMMENT ON COLUMN deployments.files IS 'Array of deployed files in JSONB format';
COMMENT ON COLUMN deployments.backup_id IS 'Backup identifier for rollback';

-- ============================================================================
-- 5. AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'code_generation', 
        'code_review', 
        'code_optimization',
        'deployment',
        'github_operation',
        'ethics_violation',
        'security_block',
        'authentication',
        'user_action'
    )),
    
    action TEXT NOT NULL,
    
    -- Request details
    request_prompt TEXT,
    request_data JSONB,
    
    -- Result
    approved BOOLEAN,
    blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    
    -- Violations
    violations JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Scores
    ethics_score INTEGER CHECK (ethics_score >= 0 AND ethics_score <= 100),
    security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Partition key (for future partitioning by month)
    created_month DATE GENERATED ALWAYS AS (DATE_TRUNC('month', created_at)::DATE) STORED
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_blocked ON audit_logs(blocked) WHERE blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_month ON audit_logs(created_month);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_audit_logs_violations_gin ON audit_logs USING GIN(violations);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_data_gin ON audit_logs USING GIN(request_data);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';
COMMENT ON COLUMN audit_logs.violations IS 'Array of violation details in JSONB';
COMMENT ON COLUMN audit_logs.created_month IS 'Partition key for monthly partitioning';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_history_updated_at
    BEFORE UPDATE ON code_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at
    BEFORE UPDATE ON deployments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment user conversation count
CREATE OR REPLACE FUNCTION increment_user_conversations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_conversations = total_conversations + 1,
        last_active_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_conversations_count
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_conversations();

-- Function to increment user code generation count
CREATE OR REPLACE FUNCTION increment_user_code_generations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_code_generations = total_code_generations + 1,
        last_active_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_code_generations_count
    AFTER INSERT ON code_history
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_code_generations();

-- Function to increment user deployment count
CREATE OR REPLACE FUNCTION increment_user_deployments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' THEN
        UPDATE users
        SET total_deployments = total_deployments + 1,
            last_active_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_deployments_count
    AFTER INSERT OR UPDATE OF status ON deployments
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_deployments();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Policies for conversations table
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
    ON conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for code_history table
CREATE POLICY "Users can view own code history"
    ON code_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own code history"
    ON code_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own code history"
    ON code_history FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for deployments table
CREATE POLICY "Users can view own deployments"
    ON deployments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deployments"
    ON deployments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployments"
    ON deployments FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for audit_logs table
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can access everything (bypass RLS)
-- This is automatic with service_role key

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- User statistics view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.total_conversations,
    u.total_code_generations,
    u.total_deployments,
    u.violation_count,
    u.is_blocked,
    u.created_at,
    u.last_active_at,
    COUNT(DISTINCT c.id) as active_conversations,
    COUNT(DISTINCT ch.id) as total_code_records,
    COUNT(DISTINCT d.id) as total_deployment_records,
    COALESCE(AVG(ch.security_score), 0) as avg_security_score,
    COALESCE(AVG(ch.ethics_score), 0) as avg_ethics_score
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id AND c.is_active = TRUE
LEFT JOIN code_history ch ON u.id = ch.user_id
LEFT JOIN deployments d ON u.id = d.user_id
GROUP BY u.id;

-- Recent activity view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'conversation' as activity_type,
    c.id,
    c.user_id,
    c.title as description,
    c.created_at,
    c.updated_at
FROM conversations c
UNION ALL
SELECT 
    'code_generation' as activity_type,
    ch.id,
    ch.user_id,
    ch.prompt as description,
    ch.created_at,
    ch.updated_at
FROM code_history ch
UNION ALL
SELECT 
    'deployment' as activity_type,
    d.id,
    d.user_id,
    d.deployment_type || ' - ' || COALESCE(d.repository_name, d.target_url, 'unknown') as description,
    d.created_at,
    d.updated_at
FROM deployments d
ORDER BY created_at DESC;

-- Comments
COMMENT ON VIEW user_stats IS 'Aggregated user statistics';
COMMENT ON VIEW recent_activity IS 'Recent activity across all types';

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Note: Initial user will be created when they first sign in
-- This is just the schema setup

-- ============================================================================
-- GRANTS (for service role)
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON users, conversations, code_history, deployments TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role, authenticated;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- Verify tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

-- Done!
