-- Setup Supabase Storage Buckets for HOLLY
-- Run this in Supabase SQL Editor or via migrations

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('holly-audio', 'holly-audio', true, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/aac']::text[]),
  ('holly-video', 'holly-video', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm']::text[]),
  ('holly-images', 'holly-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']::text[]),
  ('holly-code', 'holly-code', true, 5242880, ARRAY['text/plain', 'text/javascript', 'text/x-python', 'application/json', 'text/html', 'text/css']::text[]),
  ('holly-documents', 'holly-documents', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']::text[]),
  ('holly-data', 'holly-data', true, 10485760, ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/xml', 'application/sql']::text[])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for each bucket
DO $$
DECLARE
  bucket_name TEXT;
BEGIN
  FOR bucket_name IN SELECT unnest(ARRAY['holly-audio', 'holly-video', 'holly-images', 'holly-code', 'holly-documents', 'holly-data'])
  LOOP
    -- Allow authenticated users to upload
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to %I"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = %L)
    ', bucket_name, bucket_name);

    -- Allow public read access
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "Allow public read access to %I"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = %L)
    ', bucket_name, bucket_name);

    -- Allow users to delete their own files
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "Allow users to delete own files in %I"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1])
    ', bucket_name, bucket_name);
  END LOOP;
END $$;

-- Summary
SELECT 
  'Storage buckets created successfully!' as message,
  COUNT(*) as bucket_count
FROM storage.buckets
WHERE name LIKE 'holly-%';
