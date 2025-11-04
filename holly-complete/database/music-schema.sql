-- ============================================
-- HOLLY MUSIC STUDIO - DATABASE SCHEMA
-- ============================================
-- Created: November 3, 2025
-- Purpose: Complete music generation system with 13 languages
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SONGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Song metadata
  title TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  
  -- Content
  lyrics TEXT,
  style TEXT NOT NULL,
  language VARCHAR(10) NOT NULL,
  
  -- Audio
  audio_url TEXT,
  artwork_url TEXT,
  duration INTEGER, -- seconds
  
  -- Suno integration
  suno_song_id TEXT UNIQUE,
  suno_metadata JSONB,
  
  -- Status
  generation_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, complete, failed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
CREATE INDEX idx_songs_language ON songs(language);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_songs_status ON songs(generation_status);
CREATE INDEX idx_songs_suno_id ON songs(suno_song_id);

-- ============================================
-- ARTISTS TABLE (Personas)
-- ============================================
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  
  -- Musical preferences
  style_preferences JSONB DEFAULT '[]'::jsonb, -- ["R&B", "Soul", "Jazz"]
  vocal_characteristics JSONB DEFAULT '{}'::jsonb, -- {"tone": "smooth", "range": "alto"}
  language_preferences TEXT[] DEFAULT ARRAY[]::TEXT[], -- ["en", "es", "pt"]
  
  -- AI generation settings
  image_generation_prompt TEXT,
  
  -- Stats
  song_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_artists_user_id ON artists(user_id);
CREATE INDEX idx_artists_created_at ON artists(created_at DESC);

-- ============================================
-- PLAYLISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Playlist info
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  
  -- Settings
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Stats
  song_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_created_at ON playlists(created_at DESC);

-- ============================================
-- PLAYLIST_SONGS TABLE (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (playlist_id, song_id)
);

-- Indexes
CREATE INDEX idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_song ON playlist_songs(song_id);
CREATE INDEX idx_playlist_songs_position ON playlist_songs(playlist_id, position);

-- ============================================
-- MUSIC_VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS music_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Video info
  title TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  
  -- Generation settings
  style_prompt TEXT,
  video_generation_metadata JSONB,
  
  -- Status
  generation_status VARCHAR(20) DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_music_videos_song_id ON music_videos(song_id);
CREATE INDEX idx_music_videos_user_id ON music_videos(user_id);
CREATE INDEX idx_music_videos_created_at ON music_videos(created_at DESC);

-- ============================================
-- SONG_LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS song_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (user_id, song_id)
);

-- Indexes
CREATE INDEX idx_song_likes_user ON song_likes(user_id);
CREATE INDEX idx_song_likes_song ON song_likes(song_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_videos_updated_at BEFORE UPDATE ON music_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update artist song count
CREATE OR REPLACE FUNCTION update_artist_song_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE artists SET song_count = song_count + 1 WHERE id = NEW.artist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE artists SET song_count = song_count - 1 WHERE id = OLD.artist_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.artist_id IS DISTINCT FROM NEW.artist_id THEN
    UPDATE artists SET song_count = song_count - 1 WHERE id = OLD.artist_id;
    UPDATE artists SET song_count = song_count + 1 WHERE id = NEW.artist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artist_song_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON songs
FOR EACH ROW EXECUTE FUNCTION update_artist_song_count();

-- Update playlist song count
CREATE OR REPLACE FUNCTION update_playlist_song_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET song_count = song_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET song_count = song_count - 1 WHERE id = OLD.playlist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlist_song_count_trigger
AFTER INSERT OR DELETE ON playlist_songs
FOR EACH ROW EXECUTE FUNCTION update_playlist_song_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_likes ENABLE ROW LEVEL SECURITY;

-- Songs policies
CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- Artists policies
CREATE POLICY "Users can view their own artists"
  ON artists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own artists"
  ON artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artists"
  ON artists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artists"
  ON artists FOR DELETE
  USING (auth.uid() = user_id);

-- Playlists policies
CREATE POLICY "Users can view their own playlists"
  ON playlists FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert their own playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Playlist songs policies
CREATE POLICY "Users can view songs in their playlists"
  ON playlist_songs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_id AND (user_id = auth.uid() OR is_public = TRUE)
  ));

CREATE POLICY "Users can add songs to their playlists"
  ON playlist_songs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can remove songs from their playlists"
  ON playlist_songs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()
  ));

-- Music videos policies
CREATE POLICY "Users can view their own music videos"
  ON music_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own music videos"
  ON music_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own music videos"
  ON music_videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own music videos"
  ON music_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Song likes policies
CREATE POLICY "Users can view all song likes"
  ON song_likes FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can like songs"
  ON song_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike songs"
  ON song_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('song-audio', 'song-audio', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('song-artwork', 'song-artwork', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('artist-avatars', 'artist-avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('playlist-covers', 'playlist-covers', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('music-videos', 'music-videos', false);

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample artist
-- INSERT INTO artists (user_id, name, bio, style_preferences, vocal_characteristics, language_preferences)
-- VALUES (
--   auth.uid(),
--   'Luna Eclipse',
--   'R&B and Soul artist with smooth vocals',
--   '["R&B", "Soul", "Neo-Soul"]'::jsonb,
--   '{"tone": "smooth", "range": "alto", "style": "soulful"}'::jsonb,
--   ARRAY['en', 'pt', 'es']
-- );

-- ============================================
-- VIEWS (Optional - for analytics)
-- ============================================

CREATE OR REPLACE VIEW user_music_stats AS
SELECT 
  user_id,
  COUNT(DISTINCT songs.id) as total_songs,
  COUNT(DISTINCT artists.id) as total_artists,
  COUNT(DISTINCT playlists.id) as total_playlists,
  COUNT(DISTINCT song_likes.song_id) as total_likes
FROM auth.users
LEFT JOIN songs ON songs.user_id = auth.users.id
LEFT JOIN artists ON artists.user_id = auth.users.id
LEFT JOIN playlists ON playlists.user_id = auth.users.id
LEFT JOIN song_likes ON song_likes.user_id = auth.users.id
GROUP BY user_id;

-- ============================================
-- COMPLETION
-- ============================================

-- Schema version
CREATE TABLE IF NOT EXISTS schema_versions (
  version VARCHAR(10) PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_versions (version, description)
VALUES ('1.0.0', 'Initial music studio schema with songs, artists, playlists, and music videos');

-- ============================================
-- END OF SCHEMA
-- ============================================
