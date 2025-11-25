/**
 * File Storage System - Vercel Blob Implementation
 * Handles file uploads, storage, and retrieval
 */

import { put, del, list } from '@vercel/blob';
import { prisma } from '@/lib/db';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

export type BucketType = 'images' | 'audio' | 'video' | 'documents' | 'general';

/**
 * Upload file to Vercel Blob storage
 */
export async function uploadFile(
  file: File,
  bucketType: BucketType = 'general',
  options?: {
    userId?: string;
    conversationId?: string;
    metadata?: Record<string, any>;
  }
): Promise<UploadResult> {
  try {
    console.log('[uploadFile] Starting upload:', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      bucketType 
    });

    // Validate file
    if (!file || !(file instanceof File)) {
      console.error('[uploadFile] Invalid file parameter');
      return { 
        success: false, 
        error: 'Invalid file parameter' 
      };
    }

    if (!file.name) {
      console.error('[uploadFile] File name is missing');
      return { 
        success: false, 
        error: 'File name is missing' 
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${bucketType}/${timestamp}_${randomString}_${safeName}`;

    console.log('[uploadFile] Generated filename:', fileName);

    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('[uploadFile] Upload successful:', blob.url);

    // Save metadata to database
    if (options?.userId) {
      try {
        await prisma.fileUpload.create({
          data: {
            userId: options.userId,
            conversationId: options.conversationId || null,
            fileName: file.name,
            fileType: bucketType,
            fileSize: file.size,
            blobUrl: blob.url,
            storagePath: fileName,
            publicUrl: blob.url,
            mimeType: file.type,
            metadata: options.metadata || {},
          }
        });
      } catch (dbError) {
        console.error('[uploadFile] Database error (non-fatal):', dbError);
        // Continue even if DB save fails
      }
    }

    return {
      success: true,
      url: blob.url,
      fileName: file.name,
      fileSize: file.size
    };

  } catch (error) {
    console.error('[uploadFile] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Delete file from Vercel Blob storage
 */
export async function deleteFile(filePath: string): Promise<UploadResult> {
  try {
    await del(filePath);
    
    // Remove from database
    try {
      await prisma.fileUpload.deleteMany({
        where: { storagePath: filePath }
      });
    } catch (dbError) {
      console.error('[deleteFile] Database error (non-fatal):', dbError);
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteFile] Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

/**
 * List files in a bucket
 */
export async function listFiles(prefix?: string) {
  try {
    const { blobs } = await list({ prefix });
    return { success: true, files: blobs };
  } catch (error) {
    console.error('[listFiles] List error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List failed'
    };
  }
}

/**
 * Get user's uploaded files from database
 */
export async function getUserFiles(userId: string, bucketType?: BucketType) {
  try {
    const files = await prisma.fileUpload.findMany({
      where: {
        userId,
        ...(bucketType && { fileType: bucketType })
      },
      orderBy: { uploadedAt: 'desc' },
      take: 100
    });

    return { success: true, files };
  } catch (error) {
    console.error('[getUserFiles] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user files'
    };
  }
}
