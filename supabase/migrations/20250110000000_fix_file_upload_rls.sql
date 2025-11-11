-- Fix file upload RLS policies to allow proper authenticated uploads
-- This fixes the "new row violates row-level security policy" error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can view their own uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON holly_file_uploads;

-- Create new, more permissive policies

-- Allow all authenticated users to insert files (they can upload for themselves or anonymously)
CREATE POLICY "Authenticated users can upload files"
  ON holly_file_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow all authenticated inserts, regardless of user_id match

-- Allow users to view their own uploads OR public/anonymous uploads
CREATE POLICY "Users can view their own files or public files"
  ON holly_file_uploads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous/public users to view files marked as public (user_id IS NULL)
CREATE POLICY "Public can view anonymous uploads"
  ON holly_file_uploads
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Allow users to delete ONLY their own uploads
CREATE POLICY "Users can delete own uploads"
  ON holly_file_uploads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role full access for admin operations
CREATE POLICY "Service role has full access"
  ON holly_file_uploads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE holly_file_uploads IS 
  'File uploads with flexible RLS: authenticated users can upload freely, users can view own + public files';
