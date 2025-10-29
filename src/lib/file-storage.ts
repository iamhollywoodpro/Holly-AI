// File Storage Utilities for HOLLY
// Handles file uploads to Supabase Storage

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Changed from SUPABASE_SERVICE_ROLE_KEY
);

// File type to bucket mapping
const FILE_TYPE_BUCKETS: Record<string, string> = {
  // Audio files
  mp3: 'holly-audio',
  wav: 'holly-audio',
  m4a: 'holly-audio',
  aac: 'holly-audio',
  ogg: 'holly-audio',
  flac: 'holly-audio',
  wma: 'holly-audio',
  
  // Video files
  mp4: 'holly-video',
  mov: 'holly-video',
  avi: 'holly-video',
  webm: 'holly-video',
  mkv: 'holly-video',
  wmv: 'holly-video',
  
  // Image files
  png: 'holly-images',
  jpg: 'holly-images',
  jpeg: 'holly-images',
  gif: 'holly-images',
  svg: 'holly-images',
  webp: 'holly-images',
  bmp: 'holly-images',
  
  // Code files
  js: 'holly-code',
  ts: 'holly-code',
  tsx: 'holly-code',
  jsx: 'holly-code',
  py: 'holly-code',
  css: 'holly-code',
  html: 'holly-code',
  json: 'holly-code',
  xml: 'holly-code',
  yaml: 'holly-code',
  yml: 'holly-code',
  sql: 'holly-code',
  
  // Document files
  pdf: 'holly-documents',
  txt: 'holly-documents',
  doc: 'holly-documents',
  docx: 'holly-documents',
  md: 'holly-documents',
  
  // Data files
  csv: 'holly-data',
  xlsx: 'holly-data',
  xls: 'holly-data',
};

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  conversationId: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension) {
      return { success: false, error: 'Invalid file name' };
    }

    // Determine bucket
    const bucket = FILE_TYPE_BUCKETS[fileExtension];
    if (!bucket) {
      return { success: false, error: `Unsupported file type: ${fileExtension}` };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${userId}/${conversationId}/${timestamp}-${file.name}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' };
    }

    // Save metadata to database
    await saveFileMetadata({
      conversation_id: conversationId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: fileName,
      bucket_name: bucket,
      public_url: urlData.publicUrl,
    });

    return { success: true, publicUrl: urlData.publicUrl };
  } catch (err) {
    console.error('Upload error:', err);
    return { url: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Save file metadata to database
 */
async function saveFileMetadata(metadata: {
  conversation_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  bucket_name: string;
  public_url: string;
}) {
  try {
    const { error } = await supabase
      .from('holly_file_uploads')
      .insert(metadata);

    if (error) {
      console.error('Failed to save file metadata:', error);
    }
  } catch (err) {
    console.error('Metadata save error:', err);
  }
}

/**
 * Get all files for a conversation
 */
export async function getConversationFiles(conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('holly_file_uploads')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get files:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Get files error:', err);
    return [];
  }
}

/**
 * Delete a file from storage and database
 */
export async function deleteFile(fileId: string, storagePath: string, bucketName: string) {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([storagePath]);

    if (storageError) {
      console.error('Failed to delete from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('holly_file_uploads')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Failed to delete from database:', dbError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete file error:', err);
    return false;
  }
}
