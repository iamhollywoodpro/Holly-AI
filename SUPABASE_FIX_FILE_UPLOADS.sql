-- SUPABASE FIX: File Upload RLS Policies
-- Run this in Supabase SQL Editor to fix "row-level security policy" errors

-- Fix 1: Allow authenticated users to upload files
ALTER TABLE holly_file_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can view their own files" ON holly_file_uploads;

-- Create new policies for file uploads
CREATE POLICY "Users can upload their own files"
ON holly_file_uploads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own files"
ON holly_file_uploads
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Fix 2: Ensure storage buckets allow uploads
-- This needs to be done in Supabase Dashboard > Storage > Bucket Settings
-- For each bucket (holly-audio, holly-video, holly-images, holly-code, holly-documents, holly-data):
-- 1. Set "Public bucket" to OFF (keep private)
-- 2. Add policy: "Allow authenticated uploads"
--    SELECT: (bucket_id = 'bucket-name')
--    INSERT: (bucket_id = 'bucket-name') AND (auth.role() = 'authenticated')
--    UPDATE: (bucket_id = 'bucket-name') AND (auth.role() = 'authenticated')
--    DELETE: (bucket_id = 'bucket-name') AND (auth.role() = 'authenticated')

-- Alternative: If you want to allow ALL uploads (less secure but works):
DROP POLICY IF EXISTS "Allow all uploads" ON holly_file_uploads;
CREATE POLICY "Allow all uploads"
ON holly_file_uploads
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: After running this, test file upload in the app
-- If still failing, check Supabase logs for specific error messages
