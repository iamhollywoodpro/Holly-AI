/**
 * Generated Images API — serves images from public/generated-images/
 *
 * Next.js standalone server doesn't serve files from public/ that were created
 * after the build. This API route reads the file from disk and serves it with
 * proper caching headers.
 *
 * URL: /api/generated-images/{filename}
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename); // Prevent path traversal
  const filepath = path.join(process.cwd(), 'public', 'generated-images', filename);

  try {
    const data = await fs.readFile(filepath);

    // Determine content type from extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      'image/png';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}
