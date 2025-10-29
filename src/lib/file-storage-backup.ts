// HOLLY Phase 3: File Storage Utilities
// Supabase Storage integration for all file types

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  url?: string;
  publicUrl?: string;
  error?: string;
  metadata?: {
    size: number;
    type: string;
    name: string;
  };
}

export interface FileMetadata {
  id: string;
  conversation_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  metadata: {
    duration?: number;
    dimensions?: { width: number; height: number };
    transcription?: string;
    analysis?: any;
  };
  created_at: string;
}

// Storage bucket names
const BUCKETS = {
  audio: 'holly-audio',
  video: 'holly-video',
  images: 'holly-images',
  documents: 'holly-documents',
  code: 'holly-code',
  data: 'holly-data',
};

/**
 * Initialize storage buckets (run once during setup)
 */
export async function initializeStorageBuckets() {
  const bucketsToCreate = Object.values(BUCKETS);
  
  for (const bucketName of bucketsToCreate) {
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    const exists = existingBuckets?.some(b => b.name === bucketName);
    
    if (!exists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 104857600, // 100MB
      });
      
      if (error) {
        console.error(`Failed to create bucket ${bucketName}:`, error);
      } else {
        console.log(`✅ Created bucket: ${bucketName}`);
      }
    }
  }
}

/**
 * Get appropriate bucket for file type
 */
function getBucketForFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'];
  const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv'];
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];
  const docExts = ['pdf', 'txt', 'doc', 'docx', 'rtf', 'md'];
  const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'css', 'html', 'json', 'xml', 'yaml', 'sql'];
  const dataExts = ['csv', 'xlsx', 'xls'];
  
  if (ext && audioExts.includes(ext)) return BUCKETS.audio;
  if (ext && videoExts.includes(ext)) return BUCKETS.video;
  if (ext && imageExts.includes(ext)) return BUCKETS.images;
  if (ext && docExts.includes(ext)) return BUCKETS.documents;
  if (ext && codeExts.includes(ext)) return BUCKETS.code;
  if (ext && dataExts.includes(ext)) return BUCKETS.data;
  
  return BUCKETS.documents; // Default
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  conversationId: string
): Promise<FileUploadResult> {
  try {
    const bucket = getBucketForFileType(file.name);
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
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    // Save metadata to database
    const { data: metadataRecord, error: dbError } = await supabase
      .from('holly_file_uploads')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: fileName,
        public_url: urlData.publicUrl,
        metadata: {},
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database insert error:', dbError);
      return { success: false, error: dbError.message };
    }
    
    return {
      success: true,
      fileId: metadataRecord.id,
      url: data.path,
      publicUrl: urlData.publicUrl,
      metadata: {
        size: file.size,
        type: file.type,
        name: file.name,
      },
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get file metadata from database
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  const { data, error } = await supabase
    .from('holly_file_uploads')
    .select('*')
    .eq('id', fileId)
    .single();
  
  if (error || !data) {
    console.error('Failed to fetch file metadata:', error);
    return null;
  }
  
  return data as FileMetadata;
}

/**
 * Get all files for a conversation
 */
export async function getConversationFiles(conversationId: string): Promise<FileMetadata[]> {
  const { data, error } = await supabase
    .from('holly_file_uploads')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch conversation files:', error);
    return [];
  }
  
  return data as FileMetadata[];
}

/**
 * Update file metadata (after processing)
 */
export async function updateFileMetadata(
  fileId: string,
  metadata: Partial<FileMetadata['metadata']>
): Promise<boolean> {
  const { error } = await supabase
    .from('holly_file_uploads')
    .update({ metadata })
    .eq('id', fileId);
  
  if (error) {
    console.error('Failed to update file metadata:', error);
    return false;
  }
  
  return true;
}

/**
 * Delete file from storage and database
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    // Get file metadata first
    const metadata = await getFileMetadata(fileId);
    if (!metadata) return false;
    
    // Determine bucket
    const bucket = getBucketForFileType(metadata.file_name);
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([metadata.storage_path]);
    
    if (storageError) {
      console.error('Storage delete error:', storageError);
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('holly_file_uploads')
      .delete()
      .eq('id', fileId);
    
    if (dbError) {
      console.error('Database delete error:', dbError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

/**
 * Download file as blob
 */
export async function downloadFile(fileId: string): Promise<Blob | null> {
  const metadata = await getFileMetadata(fileId);
  if (!metadata) return null;
  
  const bucket = getBucketForFileType(metadata.file_name);
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(metadata.storage_path);
  
  if (error) {
    console.error('Download error:', error);
    return null;
  }
  
  return data;
}
