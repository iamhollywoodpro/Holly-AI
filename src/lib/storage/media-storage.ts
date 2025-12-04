/**
 * HOLLY Media Storage Service
 * 
 * Handles uploading and managing generated media (images, videos, audio)
 * Uses Vercel Blob Storage for reliable, fast CDN-backed storage
 */

import { put } from '@vercel/blob';

export type MediaType = 'image' | 'video' | 'audio';

export interface UploadMediaResult {
  url: string;
  type: MediaType;
  size: number;
  contentType: string;
  pathname: string;
}

/**
 * Upload generated media to Vercel Blob Storage
 * 
 * @param blob - The media file as a Blob or Buffer
 * @param filename - Name for the file (e.g., 'robot-image.png')
 * @param contentType - MIME type (e.g., 'image/png', 'audio/mpeg')
 * @returns Public URL and metadata for the uploaded file
 */
export async function uploadGeneratedMedia(
  blob: Blob | Buffer,
  filename: string,
  contentType: string
): Promise<UploadMediaResult> {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFilename = `holly-generated/${timestamp}-${sanitizedFilename}`;

    // Upload to Vercel Blob Storage
    const result = await put(uniqueFilename, blob, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    // Determine media type from content type
    let type: MediaType = 'image';
    if (contentType.startsWith('video/')) type = 'video';
    else if (contentType.startsWith('audio/')) type = 'audio';

    return {
      url: result.url,
      type,
      size: blob instanceof Blob ? blob.size : blob.length,
      contentType,
      pathname: result.pathname,
    };
  } catch (error) {
    console.error('❌ Media upload failed:', error);
    throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Convert fetch Response to uploadable format
 */
export async function uploadFromResponse(
  response: Response,
  filename: string
): Promise<UploadMediaResult> {
  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  
  return uploadGeneratedMedia(blob, filename, contentType);
}

/**
 * Helper: Get media type from content-type
 */
export function getMediaTypeFromContentType(contentType: string): MediaType {
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'image';
}
