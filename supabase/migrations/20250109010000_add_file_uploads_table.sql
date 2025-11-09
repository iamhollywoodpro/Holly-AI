-- Create table for tracking file uploads
CREATE TABLE IF NOT EXISTS holly_file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'audio', 'video', 'images', 'code', 'documents', 'data'
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for faster queries
CREATE INDEX idx_file_uploads_user_id ON holly_file_uploads(user_id);
CREATE INDEX idx_file_uploads_conversation_id ON holly_file_uploads(conversation_id);
CREATE INDEX idx_file_uploads_file_type ON holly_file_uploads(file_type);
CREATE INDEX idx_file_uploads_uploaded_at ON holly_file_uploads(uploaded_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE holly_file_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for file uploads
CREATE POLICY "Users can view their own uploads"
  ON holly_file_uploads
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own uploads"
  ON holly_file_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own uploads"
  ON holly_file_uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE holly_file_uploads IS 'Tracks all file uploads made through HOLLY chat interface';
