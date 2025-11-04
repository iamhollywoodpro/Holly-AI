-- Music Industry Database Schema
-- Supports A&R, Record Label Executive, and Music Manager capabilities

-- Enable vector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- MUSIC MEMORIES (Vector Search Enabled)
-- =====================================================
CREATE TABLE IF NOT EXISTS music_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('submission', 'sync_opportunity', 'playlist_pitch', 'industry_contact', 'campaign', 'track_analysis', 'relationship')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  related_tracks TEXT[] DEFAULT ARRAY[]::TEXT[],
  related_contacts TEXT[] DEFAULT ARRAY[]::TEXT[],
  outcome TEXT CHECK (outcome IN ('success', 'pending', 'rejected', 'follow_up_needed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for music memories
CREATE INDEX idx_music_memories_user_id ON music_memories(user_id);
CREATE INDEX idx_music_memories_type ON music_memories(type);
CREATE INDEX idx_music_memories_outcome ON music_memories(outcome);
CREATE INDEX idx_music_memories_created_at ON music_memories(created_at DESC);
CREATE INDEX idx_music_memories_tags ON music_memories USING GIN(tags);
CREATE INDEX idx_music_memories_embedding ON music_memories USING ivfflat(embedding vector_cosine_ops);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_music_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id text
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  type TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  tags TEXT[],
  related_tracks TEXT[],
  related_contacts TEXT[],
  outcome TEXT,
  similarity float,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.type,
    m.title,
    m.content,
    m.metadata,
    m.tags,
    m.related_tracks,
    m.related_contacts,
    m.outcome,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at,
    m.updated_at
  FROM music_memories m
  WHERE m.user_id = match_music_memories.user_id
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- TRACKS
-- =====================================================
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  isrc TEXT,
  upc TEXT,
  duration INTEGER, -- seconds
  release_date DATE,
  genre TEXT[],
  mood TEXT[],
  
  -- Audio Features (from audio-processor.ts)
  audio_features JSONB DEFAULT '{}'::jsonb,
  hit_factor_score INTEGER CHECK (hit_factor_score >= 0 AND hit_factor_score <= 100),
  
  -- Files
  audio_url TEXT,
  artwork_url TEXT,
  
  -- Metadata
  lyrics TEXT,
  credits JSONB DEFAULT '{}'::jsonb, -- producers, writers, etc.
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'released', 'archived')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_release_date ON tracks(release_date DESC);
CREATE INDEX idx_tracks_genre ON tracks USING GIN(genre);
CREATE INDEX idx_tracks_hit_factor_score ON tracks(hit_factor_score DESC);

-- =====================================================
-- SUBMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  
  -- Submission Details
  submitted_to TEXT NOT NULL, -- Name of curator, label, etc.
  submitted_to_type TEXT NOT NULL CHECK (submitted_to_type IN ('playlist', 'sync', 'label', 'radio', 'blog')),
  submitted_to_email TEXT,
  
  -- Dates
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  
  -- Email
  email_sent BOOLEAN DEFAULT false,
  email_content TEXT,
  
  -- Response
  response_received BOOLEAN DEFAULT false,
  response_content TEXT,
  
  -- Outcome
  outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('accepted', 'rejected', 'pending', 'no_response', 'withdrawn')),
  
  -- Follow-ups
  follow_up_count INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_track_id ON submissions(track_id);
CREATE INDEX idx_submissions_outcome ON submissions(outcome);
CREATE INDEX idx_submissions_next_follow_up ON submissions(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX idx_submissions_submission_date ON submissions(submission_date DESC);

-- =====================================================
-- SYNC OPPORTUNITIES
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Opportunity Details
  opportunity_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  project_type TEXT NOT NULL, -- TV Show, Movie, Ad Campaign, etc.
  brief TEXT,
  
  -- Requirements
  requirements JSONB DEFAULT '{}'::jsonb, -- mood, genre, tempo, etc.
  
  -- Budget & Dates
  budget_min INTEGER,
  budget_max INTEGER,
  deadline DATE,
  usage_term TEXT, -- Perpetuity, 1 year, etc.
  territory TEXT, -- Worldwide, USA, etc.
  
  -- Contact
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Tracks Submitted
  tracks_submitted UUID[] DEFAULT ARRAY[]::UUID[],
  submission_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'under_review', 'shortlisted', 'won', 'lost', 'expired')),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_opportunities_user_id ON sync_opportunities(user_id);
CREATE INDEX idx_sync_opportunities_status ON sync_opportunities(status);
CREATE INDEX idx_sync_opportunities_deadline ON sync_opportunities(deadline);
CREATE INDEX idx_sync_opportunities_brand ON sync_opportunities(brand);

-- =====================================================
-- PLAYLIST CURATORS
-- =====================================================
CREATE TABLE IF NOT EXISTS playlist_curators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Curator Details
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('spotify_editorial', 'independent', 'influencer', 'blog')),
  
  -- Playlist Details
  playlist_name TEXT NOT NULL,
  playlist_url TEXT,
  platform TEXT DEFAULT 'spotify' CHECK (platform IN ('spotify', 'apple_music', 'youtube', 'soundcloud')),
  follower_count INTEGER,
  
  -- Contact
  email TEXT,
  website TEXT,
  social_media JSONB DEFAULT '{}'::jsonb,
  
  -- Submission Info
  accepts_submissions BOOLEAN DEFAULT true,
  submission_fee DECIMAL(10,2),
  approval_rate INTEGER, -- percentage
  response_time TEXT, -- "2-3 weeks", etc.
  
  -- Genre & Preferences
  genres TEXT[],
  moods TEXT[],
  tempo_preference TEXT,
  
  -- History
  tracks_submitted UUID[] DEFAULT ARRAY[]::UUID[],
  acceptance_count INTEGER DEFAULT 0,
  rejection_count INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playlist_curators_user_id ON playlist_curators(user_id);
CREATE INDEX idx_playlist_curators_type ON playlist_curators(type);
CREATE INDEX idx_playlist_curators_platform ON playlist_curators(platform);
CREATE INDEX idx_playlist_curators_genres ON playlist_curators USING GIN(genres);
CREATE INDEX idx_playlist_curators_follower_count ON playlist_curators(follower_count DESC);

-- =====================================================
-- INDUSTRY CONTACTS
-- =====================================================
CREATE TABLE IF NOT EXISTS industry_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Contact Info
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- A&R, Playlist Curator, Sync Supervisor, Manager, etc.
  company TEXT,
  
  -- Contact Details
  email TEXT,
  phone TEXT,
  website TEXT,
  social_media JSONB DEFAULT '{}'::jsonb,
  
  -- Relationship
  relationship_strength INTEGER DEFAULT 0 CHECK (relationship_strength >= 0 AND relationship_strength <= 100),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  
  -- Interaction History
  interaction_history JSONB DEFAULT '[]'::jsonb,
  
  -- Tracks & Preferences
  tracks_shared UUID[] DEFAULT ARRAY[]::UUID[],
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_industry_contacts_user_id ON industry_contacts(user_id);
CREATE INDEX idx_industry_contacts_role ON industry_contacts(role);
CREATE INDEX idx_industry_contacts_company ON industry_contacts(company);
CREATE INDEX idx_industry_contacts_relationship_strength ON industry_contacts(relationship_strength DESC);
CREATE INDEX idx_industry_contacts_last_contact ON industry_contacts(last_contact_date DESC);

-- =====================================================
-- CAMPAIGNS
-- =====================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Campaign Details
  campaign_name TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Platforms & Goals
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[], -- Spotify, TikTok, Instagram, etc.
  budget DECIMAL(10,2),
  
  goals JSONB DEFAULT '{}'::jsonb, -- streams, followers, playlists, etc.
  actual_results JSONB DEFAULT '{}'::jsonb,
  
  -- Strategies
  strategies TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused', 'cancelled')),
  
  -- ROI
  roi DECIMAL(10,2),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_track_id ON campaigns(track_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date DESC);
CREATE INDEX idx_campaigns_platforms ON campaigns USING GIN(platforms);

-- =====================================================
-- REVENUE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  
  -- Revenue Details
  source TEXT NOT NULL, -- Spotify, Sync, Performance, Mechanical, etc.
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('streaming', 'sync', 'performance', 'mechanical', 'live', 'merch', 'other')),
  
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metadata
  streams INTEGER, -- if applicable
  sync_placement TEXT, -- if sync revenue
  territory TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_revenue_user_id ON revenue(user_id);
CREATE INDEX idx_revenue_track_id ON revenue(track_id);
CREATE INDEX idx_revenue_source ON revenue(source);
CREATE INDEX idx_revenue_type ON revenue(revenue_type);
CREATE INDEX idx_revenue_period ON revenue(period_start DESC, period_end DESC);
CREATE INDEX idx_revenue_amount ON revenue(amount DESC);

-- =====================================================
-- SPOTIFY ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS spotify_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  
  -- Date
  date DATE NOT NULL,
  
  -- Metrics
  streams INTEGER DEFAULT 0,
  listeners INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  playlist_adds INTEGER DEFAULT 0,
  skip_rate DECIMAL(5,2), -- percentage
  
  -- Demographics
  top_countries JSONB DEFAULT '[]'::jsonb,
  top_cities JSONB DEFAULT '[]'::jsonb,
  age_demographics JSONB DEFAULT '{}'::jsonb,
  gender_demographics JSONB DEFAULT '{}'::jsonb,
  
  -- Playlists
  playlist_count INTEGER DEFAULT 0,
  editorial_playlists TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(track_id, date)
);

CREATE INDEX idx_spotify_analytics_user_id ON spotify_analytics(user_id);
CREATE INDEX idx_spotify_analytics_track_id ON spotify_analytics(track_id);
CREATE INDEX idx_spotify_analytics_date ON spotify_analytics(date DESC);
CREATE INDEX idx_spotify_analytics_streams ON spotify_analytics(streams DESC);

-- =====================================================
-- FOLLOW-UP QUEUE
-- =====================================================
CREATE TABLE IF NOT EXISTS follow_up_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Reference
  reference_type TEXT NOT NULL CHECK (reference_type IN ('submission', 'sync_opportunity', 'contact')),
  reference_id UUID NOT NULL,
  
  -- Follow-up Details
  scheduled_date DATE NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Email
  email_to TEXT,
  email_subject TEXT,
  email_body TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'completed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_follow_up_queue_user_id ON follow_up_queue(user_id);
CREATE INDEX idx_follow_up_queue_scheduled_date ON follow_up_queue(scheduled_date);
CREATE INDEX idx_follow_up_queue_status ON follow_up_queue(status);
CREATE INDEX idx_follow_up_queue_priority ON follow_up_queue(priority);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_music_memories_updated_at BEFORE UPDATE ON music_memories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_opportunities_updated_at BEFORE UPDATE ON sync_opportunities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlist_curators_updated_at BEFORE UPDATE ON playlist_curators
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_contacts_updated_at BEFORE UPDATE ON industry_contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_updated_at BEFORE UPDATE ON revenue
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spotify_analytics_updated_at BEFORE UPDATE ON spotify_analytics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_queue_updated_at BEFORE UPDATE ON follow_up_queue
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE music_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_curators ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_queue ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY music_memories_policy ON music_memories FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY tracks_policy ON tracks FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY submissions_policy ON submissions FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY sync_opportunities_policy ON sync_opportunities FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY playlist_curators_policy ON playlist_curators FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY industry_contacts_policy ON industry_contacts FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY campaigns_policy ON campaigns FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY revenue_policy ON revenue FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY spotify_analytics_policy ON spotify_analytics FOR ALL USING (user_id = current_setting('app.user_id', true));
CREATE POLICY follow_up_queue_policy ON follow_up_queue FOR ALL USING (user_id = current_setting('app.user_id', true));
