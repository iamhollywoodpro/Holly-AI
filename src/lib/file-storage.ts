import { r2Put, r2Delete, r2List, isR2Configured } from '@/lib/storage/r2-client';
import { prisma } from '@/lib/db';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

export type BucketType = 'images' | 'audio' | 'video' | 'documents' | 'general';

export async function uploadFile(
  file: File,
  bucketType: BucketType = 'general',
  options?: {
    userId?: string;
    conversationId?: string;
    metadata?: Record<string, any>;
  }
): Promise<UploadResult> {
  if (!isR2Configured()) {
    return { success: false, error: 'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.' };
  }

  try {
    console.log('[uploadFile] Starting upload:', { name: file.name, size: file.size, type: file.type, bucketType });

    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Invalid file parameter' };
    }
    if (!file.name) {
      return { success: false, error: 'File name is missing' };
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${bucketType}/${timestamp}_${randomString}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await r2Put(fileName, buffer, file.type || 'application/octet-stream');

    console.log('[uploadFile] Upload successful:', result.url);

    if (options?.userId) {
      try {
        await prisma.fileUpload.create({
          data: {
            userId: options.userId,
            conversationId: options.conversationId || null,
            fileName: file.name,
            fileType: bucketType,
            fileSize: file.size,
            blobUrl: result.url,
            storagePath: fileName,
            publicUrl: result.url,
            mimeType: file.type,
            metadata: options.metadata || {},
          }
        });
      } catch (dbError) {
        console.error('[uploadFile] Database error (non-fatal):', dbError);
      }
    }

    return { success: true, url: result.url, fileName: file.name, fileSize: file.size };
  } catch (error) {
    console.error('[uploadFile] Upload failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

export async function deleteFile(filePath: string): Promise<UploadResult> {
  try {
    await r2Delete(filePath);
    try {
      await prisma.fileUpload.deleteMany({ where: { storagePath: filePath } });
    } catch (dbError) {
      console.error('[deleteFile] Database error (non-fatal):', dbError);
    }
    return { success: true };
  } catch (error) {
    console.error('[deleteFile] Delete error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
}

export async function listFiles(prefix?: string) {
  try {
    const files = await r2List(prefix);
    return { success: true, files };
  } catch (error) {
    console.error('[listFiles] List error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'List failed' };
  }
}

export async function getUserFiles(userId: string, bucketType?: BucketType) {
  try {
    const files = await prisma.fileUpload.findMany({
      where: { userId, ...(bucketType && { fileType: bucketType }) },
      orderBy: { uploadedAt: 'desc' },
      take: 100
    });
    return { success: true, files };
  } catch (error) {
    console.error('[getUserFiles] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user files' };
  }
}
