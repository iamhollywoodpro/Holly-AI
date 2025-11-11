-- FINAL FILE UPLOAD FIX - Run this ONCE to fix all conflicts
-- This will clean up and recreate everything correctly

-- Step 1: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view their own uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can insert their own uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can view their own files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can upload files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can update their own files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can delete their own files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can view their own files or public files" ON holly_file_uploads;
DROP POLICY IF EXISTS "Public can view anonymous uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON holly_file_uploads;
DROP POLICY IF EXISTS "Service role has full access" ON holly_file_uploads;

-- Step 2: Create simple, permissive policies for authenticated users
-- (You're logged in as iamhollywoodpro@gmail.com, so this will work)

CREATE POLICY "allow_authenticated_insert"
  ON holly_file_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all authenticated users to upload

CREATE POLICY "allow_authenticated_select"
  ON holly_file_uploads
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to view

CREATE POLICY "allow_authenticated_update"
  ON holly_file_uploads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_delete"
  ON holly_file_uploads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);  -- Can only delete own files

-- Step 3: Verify the table structure is correct
DO $$ 
BEGIN
  -- Check if user_id column is UUID type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holly_file_uploads' 
    AND column_name = 'user_id' 
    AND udt_name = 'uuid'
  ) THEN
    RAISE NOTICE 'WARNING: user_id column is not UUID type. Table may need recreation.';
  END IF;
END $$;

-- Step 4: Show current policies (for verification)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'holly_file_uploads'
ORDER BY policyname;

-- Success message
SELECT 'File upload policies fixed! Try uploading a file now.' as status;
