import { r2Put, isR2Configured } from '@/lib/storage/r2-client';

export type MediaType = 'image' | 'video' | 'audio';

export interface UploadMediaResult {
  url: string;
  type: MediaType;
  size: number;
  contentType: string;
  pathname: string;
}

export async function uploadGeneratedMedia(
  blob: Blob | Buffer,
  filename: string,
  contentType: string
): Promise<UploadMediaResult> {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in environment.');
  }

  try {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFilename = `holly-generated/${timestamp}-${sanitizedFilename}`;

    const buffer = blob instanceof Blob ? Buffer.from(await blob.arrayBuffer()) : blob;

    const result = await r2Put(uniqueFilename, buffer, contentType);

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

export async function uploadFromResponse(
  response: Response,
  filename: string
): Promise<UploadMediaResult> {
  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  return uploadGeneratedMedia(blob, filename, contentType);
}

export function getMediaTypeFromContentType(contentType: string): MediaType {
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'image';
}
