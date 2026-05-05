import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'holly-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export interface R2UploadResult {
  url: string;
  pathname: string;
}

export async function r2Put(
  key: string,
  body: Buffer | Uint8Array | string | ReadableStream,
  contentType?: string,
): Promise<R2UploadResult> {
  const buffer = body instanceof ReadableStream
    ? Buffer.from(await new Response(body).arrayBuffer())
    : Buffer.isBuffer(body)
      ? body
      : typeof body === 'string'
        ? Buffer.from(body)
        : Buffer.from(body);

  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  const url = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : `/${key}`;
  return { url, pathname: key };
}

export async function r2Delete(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

export async function r2List(prefix?: string): Promise<{ key: string; size: number; lastModified?: Date }[]> {
  const result = await r2Client.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    MaxKeys: 1000,
  }));
  return (result.Contents || []).map(obj => ({
    key: obj.Key || '',
    size: obj.Size || 0,
    lastModified: obj.LastModified,
  }));
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}
