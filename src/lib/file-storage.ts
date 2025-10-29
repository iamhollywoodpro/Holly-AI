// lib/file-storage.ts - HOLLY Phase 3: File Upload & Storage System
// FIXED VERSION - All parameter validation and type safety issues resolved

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with correct frontend keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket configuration
export const STORAGE_BUCKETS = {
  audio: 'holly-audio',
  video: 'holly-video',
  images: 'holly-images',
  code: 'holly-code',
  documents: 'holly-documents',
  data: 'holly-data'
} as const;

// File type to bucket mapping
export const FILE_TYPE_MAP: Record<string, keyof typeof STORAGE_BUCKETS> = {
  // Audio
  'mp3': 'audio',
  'wav': 'audio',
  'ogg': 'audio',
  'm4a': 'audio',
  'flac': 'audio',
  'aac': 'audio',
  
  // Video
  'mp4': 'video',
  'mov': 'video',
  'avi': 'video',
  'mkv': 'video',
  'webm': 'video',
  
  // Images
  'jpg': 'images',
  'jpeg': 'images',
  'png': 'images',
  'gif': 'images',
  'webp': 'images',
  'svg': 'images',
  
  // Code
  'js': 'code',
  'ts': 'code',
  'tsx': 'code',
  'jsx': 'code',
  'py': 'code',
  'java': 'code',
  'cpp': 'code',
  'html': 'code',
  'css': 'code',
  'json': 'code',
  
  // Documents
  'pdf': 'documents',
  'doc': 'documents',
  'docx': 'documents',
  'txt': 'documents',
  'md': 'documents',
  
  // Data
  'csv': 'data',
  'xlsx': 'data',
  'xls': 'data',
  'xml': 'data',
  'sql': 'data'
};

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload a file to the appropriate Supabase storage bucket
 * @param file - The File object to upload
 * @param userId - The user's ID (optional for guest users)
 * @param conversationId - The conversation ID (optional)
 * @returns Upload result with public URL or error
 */
export async function uploadFile(
  file: File,
  userId?: string,
  conversationId?: string
): Promise<UploadResult> {
  try {
    // CRITICAL: Validate file parameter first
    if (!file) {
      console.error('[uploadFile] ERROR: file parameter is null or undefined');
      return { 
        success: false, 
        error: 'No file provided' 
      };
    }

    if (!(file instanceof File)) {
      console.error('[uploadFile] ERROR: file parameter is not a File object', typeof file);
      return { 
        success: false, 
        error: 'Invalid file parameter - not a File object' 
      };
    }

    if (!file.name) {
      console.error('[uploadFile] ERROR: file.name is missing');
      return { 
        success: false, 
        error: 'File name is missing' 
      };
    }

    console.log('[uploadFile] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: userId || 'guest',
      conversationId: conversationId || 'none'
    });

    // Extract file extension safely
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      console.error('[uploadFile] ERROR: Could not extract file extension from:', file.name);
      return { 
        success: false, 
        error: 'Invalid file name - no extension found' 
      };
    }

    // Determine bucket based on file extension
    const bucketType = FILE_TYPE_MAP[fileExtension];
    
    if (!bucketType) {
      console.error('[uploadFile] ERROR: Unsupported file type:', fileExtension);
      return { 
        success: false, 
        error: `Unsupported file type: .${fileExtension}` 
      };
    }

    const bucketName = STORAGE_BUCKETS[bucketType];
    console.log('[uploadFile] Target bucket:', bucketName, 'for type:', bucketType);

    // Generate unique file path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}_${randomString}_${safeName}`;

    console.log('[uploadFile] Generated file path:', filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[uploadFile] Upload error:', uploadError);
      return { 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      };
    }

    console.log('[uploadFile] Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('[uploadFile] ERROR: Could not generate public URL');
      return { 
        success: false, 
        error: 'Could not generate public URL' 
      };
    }

    console.log('[uploadFile] Public URL generated:', urlData.publicUrl);

    // Save metadata to database
    try {
      const { error: dbError } = await supabase
        .from('holly_file_uploads')
        .insert({
          user_id: userId || null,
          conversation_id: conversationId || null,
          file_name: file.name,
          file_type: bucketType,
          file_size: file.size,
          storage_path: filePath,
          bucket_name: bucketName,
          public_url: urlData.publicUrl,
          mime_type: file.type
        });

      if (dbError) {
        console.error('[uploadFile] Database error (non-fatal):', dbError);
        // Don't fail the upload if database insert fails
      } else {
        console.log('[uploadFile] Metadata saved to database');
      }
    } catch (dbError) {
      console.error('[uploadFile] Database exception (non-fatal):', dbError);
      // Continue - file is uploaded successfully
    }

    return { 
      success: true, 
      publicUrl: urlData.publicUrl 
    };

  } catch (error) {
    console.error('[uploadFile] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucketName: string, filePath: string): Promise<UploadResult> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('[deleteFile] Delete error:', error);
      return { 
        success: false, 
        error: `Delete failed: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteFile] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * List files in a bucket
 */
export async function listFiles(bucketName: string, path?: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);

    if (error) {
      console.error('[listFiles] List error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, files: data };
  } catch (error) {
    console.error('[listFiles] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
